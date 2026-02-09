import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Trophy, Users, CheckCircle2, User, Mail, ChevronRight, Instagram, Clock, Activity, Flag, ChevronDown, ArrowRight, Share2, Loader2, AlertCircle, X, Ticket, Edit3, Lock } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import RankingPage from './RankingPage'; 
import AdminPanel from './AdminPanel';

// === 1. IMPORTAÇÕES DO FIREBASE ===
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  doc,
  updateDoc,
  getCountFromServer 
} from "firebase/firestore";

// === 2. CONFIGURAÇÃO DO FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyB6IYFJfMSDSaR8s_VjNp9SbFaUmTmGTCs",
  authDomain: "invasores-incricao.firebaseapp.com",
  projectId: "invasores-incricao",
  storageBucket: "invasores-incricao.firebasestorage.app",
  messagingSenderId: "889392748387",
  appId: "1:889392748387:web:4909849ff880ddff122556"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const triggerConfetti = () => { console.log("🎊 CONFETTI! 🎊"); };

// === CONFIGURAÇÃO DAS ANIMAÇÕES ===
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};
const hoverEffect = { scale: 1.03, transition: { duration: 0.2 } };
const tapEffect = { scale: 0.98 };
const containerStagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
};
const itemStagger: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

// === 🚨 CONTROLE DE MANUTENÇÃO 🚨 ===
const MODO_MANUTENCAO = true; // true = Bloqueia SÓ O FORMULÁRIO false

const JuntosSomosMaisFinal = () => {
  const path = window.location.pathname;

  // === ROTEAMENTO SIMPLES ===
  if (path === '/adm') {
    return <AdminPanel />;
  }

  if (path === '/ranking') {
    return <RankingPage />;
  }

  // === ESTADOS DO FORMULÁRIO ===
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState({ name: false, email: false });
  const [confirmedData, setConfirmedData] = useState<any>(null);
  const [isFreshRegistration, setIsFreshRegistration] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', team: '', level: '', health: '', health_details: '', termsAccepted: false
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // === LINKS ===
  const INSTAGRAM_LINK = "https://www.instagram.com/invasores_081";
  const REDIRECT_WHATSAPP_LINK = "https://chat.whatsapp.com/GHCD6pjAkhVDRnQAQmMoDi?mode=gi_t"; 
  const FOOTER_WHATSAPP_LINK = "https://chat.whatsapp.com/BEjOT8bcJkZB8D8Krzxr3R"; 
  const flyerImage = "/banner.jpg"; 

  // RECUPERAR DADOS DO STORAGE
  useEffect(() => {
    const dadosSalvos = localStorage.getItem('invasores_inscricao_real_db_v2');
    if (dadosSalvos) {
      setConfirmedData(JSON.parse(dadosSalvos));
    }
  }, []);

  // REDIRECIONAMENTO WHATSAPP
  useEffect(() => {
    if (success && isFreshRegistration) {
      const timer = setTimeout(() => {
        window.open(REDIRECT_WHATSAPP_LINK, '_blank');
        setIsFreshRegistration(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, isFreshRegistration]);

  const scrollToForm = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById('inscricao');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => { if (nameInputRef.current) nameInputRef.current.focus(); }, 800);
    }
  };

  const isEmailValid = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ name: false, email: false });
    setErrorMsg('');

    if(!formData.name || !formData.email || !formData.level || !formData.termsAccepted) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }
    if (formData.name.trim().length < 3) {
      setErrorMsg("Nome muito curto.");
      setErrors(prev => ({ ...prev, name: true }));
      return;
    }
    if (!isEmailValid(formData.email)) {
      setErrorMsg("E-mail inválido.");
      setErrors(prev => ({ ...prev, email: true }));
      return;
    }

    setLoading(true);

    try {
      const equipeFinal = formData.team.trim() === "" ? "Nenhuma Equipe" : formData.team;
      const inscricoesRef = collection(db, "inscrição");

      let finalDocId = editingId;
      let numeroInscricaoFinal = confirmedData?.numero_inscricao;

      if (editingId) {
        // --- MODO EDIÇÃO (ATUALIZAR) ---
        const docRef = doc(db, "inscrição", editingId);
        await updateDoc(docRef, {
          name: formData.name,
          email: formData.email,
          team: equipeFinal,
          level: formData.level,
          health: formData.health,
          health_details: formData.health_details || "N/A",
          ultima_atualizacao: new Date().toISOString()
        });

      } else {
        // --- MODO CRIAÇÃO (NOVA) ---
        const qEmail = query(inscricoesRef, where("email", "==", formData.email));
        const emailCheck = await getDocs(qEmail);

        if (!emailCheck.empty) {
          setErrorMsg("Este e-mail já está inscrito!");
          setErrors(prev => ({ ...prev, email: true }));
          setLoading(false);
          return; 
        }

        const snapshot = await getCountFromServer(inscricoesRef);
        const proximoNumero = snapshot.data().count + 1;
        numeroInscricaoFinal = String(proximoNumero).padStart(2, '0');

        const dadosParaSalvar = {
          name: formData.name,
          email: formData.email,
          team: equipeFinal,
          level: formData.level,
          health: formData.health,
          health_details: formData.health_details || "N/A",
          numero_inscricao: numeroInscricaoFinal, 
          data_inscricao: new Date().toISOString()
        };

        const docRef = await addDoc(inscricoesRef, dadosParaSalvar);
        finalDocId = docRef.id;
      }

      const dadosLocais = {
        id: finalDocId,
        name: formData.name,
        email: formData.email,
        team: equipeFinal,
        level: formData.level,
        health: formData.health,
        health_details: formData.health_details || "N/A",
        numero_inscricao: numeroInscricaoFinal,
        termsAccepted: true
      };

      localStorage.setItem('invasores_inscricao_real_db_v2', JSON.stringify(dadosLocais));
      setConfirmedData(dadosLocais);
      setIsFreshRegistration(true);
      triggerConfetti();
      setSuccess(true);
      setEditingId(null); 
      setFormData({ name: '', email: '', team: '', level: '', health: '', health_details: '', termsAccepted: false });

    } catch (error: any) {
      console.error("Erro:", error);
      setErrorMsg("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => { setSuccess(false); setIsFreshRegistration(false); };
  const handleOpenTicket = () => { setSuccess(true); };
  
  const handleReset = () => {
    if(window.confirm("Isso fará uma NOVA inscrição. Continuar?")) {
      localStorage.removeItem('invasores_inscricao_real_db_v2');
      setSuccess(false);
      setConfirmedData(null);
      setEditingId(null);
      setIsFreshRegistration(false);
      setFormData({ name: '', email: '', team: '', level: '', health: '', health_details: '', termsAccepted: false });
    }
  };

  const handleEdit = () => {
    if (confirmedData) {
      setFormData({
        name: confirmedData.name,
        email: confirmedData.email,
        team: confirmedData.team === "Nenhuma Equipe" ? "" : confirmedData.team,
        level: confirmedData.level,
        health: confirmedData.health || '',
        health_details: confirmedData.health_details === "N/A" ? "" : confirmedData.health_details,
        termsAccepted: true
      });
      setEditingId(confirmedData.id); 
      setConfirmedData(null); 
      setSuccess(false);
      setTimeout(() => {
        const section = document.getElementById('inscricao');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleCancelEdit = () => {
    const dadosSalvos = localStorage.getItem('invasores_inscricao_real_db_v2');
    if (dadosSalvos) {
      setConfirmedData(JSON.parse(dadosSalvos));
    }
    setEditingId(null);
    setFormData({ name: '', email: '', team: '', level: '', health: '', health_details: '', termsAccepted: false });
  };

  const shareText = encodeURIComponent(`Fala! Me inscrevi no Juntos Somos +. Bora? Inscreva-se também: https://uniao-das-equipes-camaragibe.netlify.app/`);
  const shareLink = `https://wa.me/?text=${shareText}`;

  return (
    <div className="min-h-screen bg-gray-100 font-sans selection:bg-yellow-400 selection:text-blue-900 relative overflow-x-hidden">
      
      {/* === MODAL === */}
      <AnimatePresence>
        {success && confirmedData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-blue-900/95 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm relative flex flex-col items-center gap-6 my-10"
            >
              
              <button 
                onClick={handleCloseModal} 
                className="absolute -top-12 right-2 text-white/90 hover:text-white transition-colors p-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 z-[10000] active:scale-95"
              >
                <X size={24} />
                <span className="sr-only">Fechar</span>
              </button>

              <div className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative transform transition-all">
                <div className="bg-blue-900 p-8 text-center relative overflow-hidden flex items-center justify-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400"></div>
                  <motion.h2 animate={{ textShadow: ["0px 0px 0px #FACC15", "0px 0px 10px #FACC15", "0px 0px 0px #FACC15"] }} transition={{ duration: 2, repeat: Infinity }} className="text-yellow-400 font-black text-4xl italic tracking-tighter uppercase relative z-10 leading-none">JUNTOS SOMOS +</motion.h2>
                </div>
                <div className="p-6 relative bg-white pb-10">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-900 rounded-full"></div>
                  <div className="absolute -right-4 top-0 w-8 h-8 bg-blue-900 rounded-full"></div>
                  <div className="border-t-2 border-dashed border-gray-200 mb-8 mx-2"></div>
                  <div className="text-center space-y-2 mb-8">
                      <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-green-200 mb-2"><CheckCircle2 size={12} /> Inscrição Confirmada</div>
                      <h3 className="text-4xl font-black text-slate-800 uppercase leading-none break-words">{confirmedData.name}</h3>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Inscrição nº {confirmedData.numero_inscricao}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center mb-6">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Equipe</p>
                    <p className="text-blue-900 font-black text-2xl uppercase italic">{confirmedData.team}</p>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wide px-4">
                      <span className="flex items-center gap-1"><Activity size={12} className="text-orange-500"/> {confirmedData.level}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-900"/> 26 FEVEREIRO • 19h00</span>
                  </div>
                  {isFreshRegistration && (
                    <div className="absolute bottom-0 left-0 w-full bg-yellow-400 text-blue-900 text-[10px] font-bold p-2 text-center flex items-center justify-center gap-2 animate-pulse"><Loader2 className="animate-spin w-3 h-3" /> Redirecionando para WhatsApp...</div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-3">
                <p className="text-blue-200/60 text-center text-xs font-bold uppercase tracking-widest mb-2">Próximos Passos</p>
                <motion.a href={REDIRECT_WHATSAPP_LINK} target="_blank" animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full bg-green-500 hover:bg-green-400 text-white font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3 group border border-green-400/50"><span className="bg-white/20 p-1.5 rounded-lg"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></span> ENTRAR NO GRUPO VIP</motion.a>
                <motion.a href={shareLink} target="_blank" whileHover={hoverEffect} whileTap={tapEffect} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 backdrop-blur-sm"><Share2 size={18} /> Convidar um Amigo</motion.a>
                <div className="flex items-center justify-between px-2 pt-2">
                  <button onClick={handleEdit} className="text-blue-500 text-[10px] font-bold uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1.5"><Edit3 size={12} /> Editar</button>
                  <button onClick={handleReset} className="text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors">Nova Inscrição</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-blue-900 pb-24 rounded-b-[2.5rem] md:rounded-b-[3rem] shadow-2xl relative z-20 transition-all">
        <div className="w-full max-w-4xl mx-auto pt-0"><img src={flyerImage} alt="Banner" className="w-full h-auto object-contain block mx-auto" /></div>
        <div className="px-4 mt-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="max-w-4xl mx-auto bg-white text-blue-900 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="flex items-center gap-4 w-full md:w-auto"><div className="bg-yellow-400 p-3 md:p-4 rounded-2xl shadow-lg shadow-yellow-400/20 shrink-0"><Calendar size={28} className="text-blue-900" /></div><div><p className="font-extrabold text-[10px] md:text-xs uppercase text-gray-400 tracking-widest mb-1">Data</p><h3 className="text-2xl md:text-3xl font-black text-blue-900 leading-none">26 FEVEREIRO</h3></div></div>
            <div className="hidden md:block w-px h-12 bg-gray-100"></div>
            <div className="flex items-center gap-4 w-full md:w-auto"><div className="bg-yellow-400 p-3 md:p-4 rounded-2xl shadow-lg shadow-yellow-400/20 shrink-0"><MapPin size={28} className="text-blue-900" /></div><div><p className="font-extrabold text-[10px] md:text-xs uppercase text-gray-400 tracking-widest mb-1">Local</p><h3 className="text-2xl md:text-3xl font-black text-blue-900 leading-none whitespace-nowrap">Praça de <p>Camaragibe</p></h3></div></div>
            <div className="hidden md:block w-px h-12 bg-gray-100"></div>
            <motion.a whileHover={hoverEffect} whileTap={tapEffect} href="#inscricao" onClick={scrollToForm} className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black py-4 px-8 rounded-xl shadow-lg shadow-yellow-400/30 transform hover:-translate-y-1 transition-all uppercase tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer text-center">Inscrever-se <ChevronRight size={20} strokeWidth={4} /></motion.a>
          </motion.div>
        </div>
      </header>

      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeInUp} className="py-16 md:py-20 px-4 bg-gray-100">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div><span className="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-2 block">O Movimento</span><h2 className="text-4xl font-black text-blue-900 italic uppercase mb-6 leading-none">Juntos <br/> Somos +</h2><div className="space-y-4 text-gray-600 font-medium leading-relaxed text-sm md:text-base"><p>Prepare-se para um treino incrível! Convidamos você e sua equipe para mostrar a força do nosso movimento nas ruas de Camaragibe.</p><p>Nosso objetivo é incentivar as pessoas a correrem, promovendo <strong>saúde, união e motivação</strong>.</p></div></div>
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200/50 relative overflow-hidden">
              <h3 className="text-xl font-black text-blue-900 uppercase mb-6 flex items-center gap-2"><Clock size={24} className="text-yellow-400"/> Cronograma</h3>
              <div className="space-y-6">
                <ScheduleItem icon={<Users size={20} className="text-blue-900"/>} time="19h00" label="Concentração" desc="Encontro das equipes na Praça de Camaragibe."/>
                <ScheduleItem icon={<Flag size={20} className="text-blue-900"/>} time="19h30" label="Saída" desc="Largada pontual do treino."/>
                <ScheduleItem icon={<Activity size={20} className="text-blue-900"/>} time="5km" label="Percurso Leve" desc="Ideal para todos os ritmos."/>
              </div>
          </div>
        </div>
      </motion.section>

      <motion.section id="inscricao" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} className="container mx-auto px-4 pb-24 bg-gray-100">
        <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-200">
          <div className="bg-blue-900 p-8 md:p-12 lg:w-5/12 text-white relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[120px] opacity-10 transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10"><div className="inline-block bg-yellow-400 text-blue-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-6">Estrutura Completa</div><h2 className="text-3xl md:text-4xl font-black italic uppercase leading-none mb-6 text-white">Garanta <br/>sua Vaga</h2><p className="text-blue-200 leading-relaxed font-medium text-sm">Para garantir a melhor experência, teremos uma estrutura especial esperando por você.</p></div>
              <motion.div variants={containerStagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative z-10 mt-10 space-y-5">
                <motion.div variants={itemStagger}><FeatureRow icon={<CheckCircle2 size={18}/>} text="Equipe de Fotos" /></motion.div>
                <motion.div variants={itemStagger}><FeatureRow icon={<CheckCircle2 size={18}/>} text="Hidratação" /></motion.div>
                <motion.div variants={itemStagger}><FeatureRow icon={<CheckCircle2 size={18}/>} text="Guarda-Volumes" /></motion.div>
                <motion.div variants={itemStagger}><FeatureRow icon={<CheckCircle2 size={18}/>} text="Musicas" /></motion.div>
              </motion.div>
          </div>
          <div className="p-6 md:p-10 lg:w-7/12 bg-blue-50/50 relative">
            
            {/* LOGICA DE EXIBIÇÃO: Ticket > Manutenção > Formulário */}
            {confirmedData ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 py-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm border border-green-200"><Ticket size={40} strokeWidth={2} /></div>
                <h3 className="text-2xl font-black text-blue-900 uppercase italic mb-2">Você já está inscrito!</h3>
                <p className="text-blue-900/60 font-bold text-sm max-w-xs mb-8">Sua vaga está garantida. Não precisa preencher novamente.</p>
                <div className="w-full space-y-3">
                  <motion.button whileHover={hoverEffect} whileTap={tapEffect} onClick={handleOpenTicket} className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"><Ticket size={18} /> Ver Meu Ticket</motion.button>
                  <div className="flex items-center justify-between px-2 pt-2">
                    <button onClick={handleEdit} className="text-blue-500 text-[10px] font-bold uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1.5"><Edit3 size={12} /> Editar</button>
                    <button onClick={handleReset} className="text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors">Nova Inscrição</button>
                  </div>
                </div>
              </div>
            ) : MODO_MANUTENCAO ? (
               // === CARD DE MANUTENÇÃO (APENAS AQUI) ===
               <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4 space-y-6">
                 <div className="w-20 h-20 bg-slate-900/5 rounded-full flex items-center justify-center border-2 border-slate-900/10 mb-2">
                    <Lock className="text-slate-900" size={32} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">Inscrições <br/><span className="text-yellow-500">Pausadas</span> 🚀</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
                        Devido ao sucesso de acessos, estamos em manutenção programada para segurança dos dados.
                    </p>
                 </div>
                 
                 <div className="bg-white border border-blue-100 p-4 rounded-xl flex items-center gap-4 shadow-sm w-full max-w-xs">
                    <Clock className="text-blue-600" size={24} />
                    <div className="text-left">
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Retorno Previsto</p>
                        <p className="text-blue-900 font-bold text-lg">Amanhã (08/02) às 08:00h</p>
                    </div>
                 </div>
               </div>
            ) : (
              // === FORMULÁRIO (SÓ APARECE SE NÃO ESTIVER EM MANUTENÇÃO) ===
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-8 border-b border-blue-100 pb-4"><h3 className="text-2xl font-black text-blue-900 uppercase italic flex items-center gap-2">Inscreva-se <span className="text-yellow-400 text-4xl">.</span></h3><p className="text-blue-900/60 text-xs font-bold uppercase tracking-wider mt-1">Preencha seus dados abaixo</p></div>
                <div className="space-y-2"><label className="text-xs font-black text-blue-900 uppercase tracking-wider ml-1">Nome</label><div className={`flex items-center bg-white shadow-sm border focus-within:ring-4 focus-within:ring-blue-900/10 rounded-xl px-4 py-4 transition-all ${errors.name ? 'border-red-400' : 'border-blue-100 focus-within:border-blue-900'}`}><span className="text-blue-900 mr-3"><User size={18}/></span><input ref={nameInputRef} type="text" className="w-full bg-transparent outline-none font-bold text-blue-900 placeholder:text-blue-900/40 text-sm" placeholder="Ex: João Corredor" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div></div>
                <InputGroup label="E-mail" icon={<Mail size={18}/>} placeholder="exemplo@email.com" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} error={errors.email} />
                
                <InputGroup label="Equipe" icon={<Trophy size={18}/>} placeholder="Sua equipe ou deixe vazio" value={formData.team} onChange={(e:any) => setFormData({...formData, team: e.target.value})} />
                
                <div className="space-y-2"><label className="text-xs font-black text-blue-900 uppercase tracking-wider ml-1">Seu Nível de Corrida</label><div className="flex items-center bg-white shadow-sm border border-blue-100 focus-within:border-blue-900 rounded-xl px-4 py-4 transition-all relative"><span className="text-blue-900 mr-3"><Activity size={18}/></span><select className="w-full bg-transparent outline-none font-bold text-blue-900 text-sm appearance-none cursor-pointer z-10" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}><option value="" disabled>Selecione seu nível...</option><option value="Iniciante">Iniciante</option><option value="Intermediário">Intermediário</option><option value="Avançado">Avançado</option></select><ChevronDown size={16} className="absolute right-4 text-blue-900" /></div></div>
                <div className="flex items-start gap-3 mt-2 pt-2"><input type="checkbox" required id="terms" checked={formData.termsAccepted} onChange={e => setFormData({...formData, termsAccepted: e.target.checked})} className="mt-1 peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-blue-200 checked:bg-blue-900 checked:border-blue-900 bg-white" /><label htmlFor="terms" className="text-xs text-blue-900 font-bold cursor-pointer select-none leading-relaxed">Eu autorizo o uso da minha imagem e declaro estar apto fisicamente.</label></div>
                {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>}
                
                <div className="space-y-3 mt-6">
                  <motion.button disabled={loading} whileHover={hoverEffect} whileTap={tapEffect} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black text-lg py-5 rounded-xl shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-3 uppercase tracking-wider disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" /> : <>{editingId ? "Salvar Alterações" : "Confirmar Presença"} <ChevronRight size={20} strokeWidth={3} /></>}
                  </motion.button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl transition-colors uppercase tracking-wider text-xs"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

              </form>
            )}
          </div>
        </div>
      </motion.section>

      <footer className="bg-blue-950 pt-8 pb-6 border-t border-blue-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent blur-sm"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-6"><p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-1 flex items-center justify-center gap-2"><span className="w-0.5 h-0.5 bg-yellow-400 rounded-full"></span> Organização Oficial<span className="w-0.5 h-0.5 bg-yellow-400 rounded-full"></span></p><span className="text-3xl md:text-4xl font-black text-white italic tracking-tighter hover:text-yellow-400 transition-colors cursor-default select-none shadow-blue-900 drop-shadow-lg">INVASORES</span></div>
          <div className="max-w-md mx-auto bg-blue-900/50 border border-blue-800 rounded-xl p-4 mb-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h4 className="text-white font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-2 text-sm">Faça parte do time <Users size={14} className="text-yellow-400"/></h4>
              <p className="text-blue-300 text-[11px] mb-4 px-2 leading-relaxed">O <strong>Juntos Somos +</strong> é só o começo. Acompanhe nossa rotina, tire dúvidas e venha correr com a gente.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <motion.a whileHover={hoverEffect} whileTap={tapEffect} href={INSTAGRAM_LINK} target="_blank" className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-3 px-4 rounded-lg shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 text-sm"><Instagram size={16} /> SIGA NO INSTA</motion.a>
                <motion.a whileHover={hoverEffect} whileTap={tapEffect} href={FOOTER_WHATSAPP_LINK} target="_blank" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 px-4 rounded-lg shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 text-sm">
                  ENTRA NO GRUPO
                </motion.a>
              </div>
          </div>
          <div className="flex flex-col items-center gap-4 border-t border-blue-900/50 pt-4">
            <p className="text-blue-500/40 text-[10px] font-medium">© 2026 Grupo Invasores. Todos os direitos reservados.</p>
            <motion.button whileHover={hoverEffect} whileTap={tapEffect} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="py-2 px-4 rounded-full bg-blue-900/30 border border-blue-800/50 text-yellow-400 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-800 hover:text-white flex items-center gap-2">Voltar ao Topo <ArrowRight className="-rotate-90 w-3 h-3" /></motion.button>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente Auxiliares
const InputGroup = ({ label, icon, placeholder, value, onChange, type = "text", error }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-blue-900 uppercase tracking-wider ml-1">{label}</label>
    <div className={`flex items-center bg-white shadow-sm border focus-within:ring-4 focus-within:ring-blue-900/10 rounded-xl px-4 py-4 transition-all ${error ? 'border-red-400' : 'border-blue-100 focus-within:border-blue-900'}`}>
      <span className="text-blue-900 mr-3">{icon}</span>
      <input type={type} required={false} className="w-full bg-transparent outline-none font-bold text-blue-900 placeholder:text-blue-900/40 text-sm" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  </div>
);

const ScheduleItem = ({ icon, time, label, desc }: any) => (
  <div className="flex items-start gap-4"><div className="bg-blue-50 p-2.5 rounded-xl shrink-0">{icon}</div><div><div className="flex items-center gap-2 mb-0.5 flex-wrap"><span className="font-black text-blue-900 text-lg">{time}</span><span className="text-xs font-bold bg-yellow-400 text-blue-900 px-2 py-0.5 rounded uppercase">{label}</span></div><p className="text-sm text-gray-500 font-medium">{desc}</p></div></div>
);
const FeatureRow = ({ icon, text }: any) => (<div className="flex items-center gap-3 text-sm font-bold text-white/90"><span className="text-yellow-400 shrink-0">{icon}</span> {text}</div>);

export default JuntosSomosMaisFinal;