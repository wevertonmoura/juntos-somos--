import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { Trophy, Activity, ArrowLeft, Search, Users, X, RotateCcw, Trash2, MonitorPlay, Medal, Crown, ExternalLink, Edit, Save, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// === CONFIGURAÇÃO DO FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyB6IYFJfMSDSaR8s_VjNp9SbFaUmTmGTCs",
  authDomain: "invasores-incricao.firebaseapp.com",
  projectId: "invasores-incricao",
  storageBucket: "invasores-incricao.firebasestorage.app",
  messagingSenderId: "889392748387",
  appId: "1:889392748387:web:4909849ff880ddff122556"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const AdminPanel = () => {
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modoTV, setModoTV] = useState(false);
  const [rankingCompleto, setRankingCompleto] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados para Edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoTime, setNovoTime] = useState("");

  useEffect(() => {
    setLoading(true);
    const inscricoesRef = collection(db, "inscrição");
    const q = query(inscricoesRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const ordenados = data.sort((a, b) => Number(b.numero_inscricao) - Number(a.numero_inscricao));
      
      setInscritos(ordenados);
      calcularRankingManipulado(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  // === PADRONIZADOR DE NOMES ===
  const padronizarNome = (nomeBruto: string) => {
    if (!nomeBruto) return "SEM EQUIPE";

    const limpo = nomeBruto
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^A-Z0-9 ]/g, " ");

    if (limpo.includes("FORCA") && limpo.includes("HONRA")) return "FORÇA E HONRA";
    if (limpo.includes("INVASOR")) return "INVASORES";
    if (limpo.includes("CORRE") && (limpo.includes("CAMARA") || limpo.includes("GIBE"))) return "CORRE CAMARAGIBE";
    if (limpo.includes("PANGUA")) return "PANGUAS";
    if (limpo.includes("QUEM") && limpo.includes("AMA")) return "QUEM AMA CORRE";

    return limpo.trim();
  };

  // === LÓGICA DO RANKING ===
  const calcularRankingManipulado = (data: any[]) => {
    const counts: Record<string, number> = {};
    
    data.forEach(p => {
      const nomeOficial = padronizarNome(p.team);
      counts[nomeOficial] = (counts[nomeOficial] || 0) + 1;
    });

    let outrasEquipes: any[] = [];
    let invasoresCountReal = 0;

    Object.entries(counts).forEach(([name, count]) => {
      if (name === "INVASORES") {
        invasoresCountReal = count;
      } else {
        outrasEquipes.push({ name, count });
      }
    });

    outrasEquipes.sort((a, b) => b.count - a.count);

    let rankingFinal = [];

    if (outrasEquipes.length >= 3) {
      rankingFinal.push({ ...outrasEquipes[0], posicao: 1 });
      rankingFinal.push({ ...outrasEquipes[1], posicao: 2 });

      const scoreSegundo = outrasEquipes[1].count;
      const scoreTerceiroReal = outrasEquipes[2].count;
      
      let scoreInvasores = scoreTerceiroReal + 2;

      if (scoreInvasores > scoreSegundo) {
        scoreInvasores = scoreSegundo;
      }
      
      rankingFinal.push({ name: "INVASORES", count: scoreInvasores, posicao: 3 });

      outrasEquipes.slice(2).forEach((team, index) => {
        rankingFinal.push({ ...team, posicao: 4 + index });
      });

    } else if (outrasEquipes.length === 2) {
      rankingFinal.push({ ...outrasEquipes[0], posicao: 1 });
      rankingFinal.push({ ...outrasEquipes[1], posicao: 2 });
      
      const scoreInvasores = Math.max(1, outrasEquipes[1].count - 1);
      rankingFinal.push({ name: "INVASORES", count: scoreInvasores, posicao: 3 });

    } else {
      const invasoresObj = { name: "INVASORES", count: invasoresCountReal };
      rankingFinal = [...outrasEquipes, invasoresObj]
        .sort((a,b) => b.count - a.count)
        .map((item, idx) => ({ ...item, posicao: idx + 1 }));
    }

    setRankingCompleto(rankingFinal); 
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`⚠️ TEM CERTEZA?\n\nIsso vai excluir permanentemente a inscrição de:\n${nome}`)) {
        try { await deleteDoc(doc(db, "inscrição", id)); alert("Excluído com sucesso!"); } 
        catch (error) { alert("Erro ao excluir."); }
    }
  };

  // === FUNÇÕES DE EDIÇÃO ===
  const iniciarEdicao = (id: string, timeAtual: string) => {
    setEditandoId(id);
    setNovoTime(timeAtual);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNovoTime("");
  };

  const salvarEdicao = async (id: string) => {
    try {
        const docRef = doc(db, "inscrição", id);
        await updateDoc(docRef, {
            team: novoTime.toUpperCase() // Salva sempre em maiúsculo para ajudar
        });
        setEditandoId(null);
        // O onSnapshot vai atualizar a lista sozinho
    } catch (error) {
        alert("Erro ao atualizar a equipe.");
        console.error(error);
    }
  };

  const inscritosFiltrados = inscritos.filter((item) => {
    if (!busca) return true;
    const termo = padronizarNome(busca);
    const equipe = padronizarNome(item.team);
    const nome = (item.name || "").toUpperCase();
    return equipe.includes(termo) || nome.includes(termo.replace(" ", ""));
  });

  if (loading) return <div className="min-h-screen bg-blue-950 flex items-center justify-center text-white"><RotateCcw className="animate-spin mr-2"/> Carregando...</div>;

  // === MODO TV ===
  if (modoTV) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center p-4 overflow-hidden font-sans z-[9999]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-black opacity-100"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        
        <button onClick={() => setModoTV(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors z-50">
            <X size={40} strokeWidth={1.5} />
        </button>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center h-full">
            <header className="text-center mb-8 mt-4 flex-shrink-0">
                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-2 mb-4 backdrop-blur-md">
                    <Trophy className="text-yellow-400" size={18} />
                    <span className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Classificação Oficial</span>
                </div>
                <h1 className="text-white font-black text-4xl md:text-7xl italic uppercase tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    RANKING <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">DAS EQUIPES</span>
                </h1>
            </header>

            <div className="w-full flex-1 overflow-y-auto px-4 pb-20 space-y-4 scrollbar-hide">
                {rankingCompleto.map((team, index) => (
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                        key={index}
                        className={`relative flex items-center justify-between p-4 rounded-2xl shadow-xl transition-all ${
                            team.posicao === 1 ? "bg-gradient-to-r from-yellow-500 to-yellow-300 border-2 border-yellow-200 shadow-[0_0_40px_rgba(234,179,8,0.4)] scale-100 md:scale-105 z-30 mb-6 mt-2" :
                            team.posicao === 2 ? "bg-gradient-to-r from-slate-300 to-slate-100 border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-100 z-20 mb-2" :
                            team.posicao === 3 ? "bg-gradient-to-r from-orange-600 to-orange-400 border-2 border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-100 z-10 mb-6" :
                            "bg-slate-800/80 border border-slate-700 backdrop-blur-sm text-slate-300 hover:bg-slate-700/80"
                        }`}
                    >
                        {team.posicao === 1 && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-2xl"></div>}
                        <div className="flex items-center gap-4 md:gap-6 relative z-10">
                            <div className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-xl shadow-inner shrink-0 ${
                                team.posicao === 1 ? "bg-yellow-600 text-white" :
                                team.posicao === 2 ? "bg-slate-400 text-white" :
                                team.posicao === 3 ? "bg-orange-800 text-white" :
                                "bg-slate-900 text-slate-500 font-mono"
                            }`}>
                                {team.posicao === 1 ? <Crown size={32} fill="currentColor"/> : team.posicao <= 3 ? <Medal size={32} /> : <span className="text-xl md:text-2xl font-black">{team.posicao}º</span>}
                            </div>
                            <div className="flex flex-col">
                                <h2 className={`font-black text-lg md:text-3xl uppercase tracking-tight leading-none ${team.posicao <= 3 ? "text-slate-900" : "text-white"}`}>
                                    {team.name}
                                </h2>
                                {team.posicao === 1 && <span className="text-[10px] font-black uppercase tracking-widest text-yellow-900 mt-1">Líder do Evento</span>}
                            </div>
                        </div>
                        <div className={`text-right min-w-[80px] relative z-10 ${team.posicao <= 3 ? "text-slate-900" : "text-white"}`}>
                            <span className="block font-black text-3xl md:text-5xl leading-none">{team.count}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${team.posicao <= 3 ? "opacity-70" : "opacity-40"}`}>Inscritos</span>
                        </div>
                    </motion.div>
                ))}
                <div className="text-center pt-8 pb-10 opacity-40"><p className="text-white text-xs uppercase tracking-widest">Fim da Lista</p></div>
            </div>
        </div>
      </div>
    );
  }

  // === TELA ADMIN (NORMAL) ===
  return (
    <div className="min-h-screen bg-blue-950 p-4 font-sans text-white selection:bg-yellow-400 selection:text-blue-900 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-800 pb-6 pt-4 gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-yellow-400 mb-1">
                    <Trophy size={24} />
                    <h1 className="font-black text-2xl md:text-3xl uppercase italic tracking-tighter">Painel ADM</h1>
                </div>
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Gestão de Equipes</p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto justify-start">
                <button onClick={handleRefresh} title="Atualizar" className="bg-blue-900 p-2 rounded-xl active:scale-95 group"><RotateCcw size={20} className="group-hover:rotate-180 transition-transform text-blue-200" /></button>
                <button onClick={() => setModoTV(true)} className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95 transition-all">
                    <MonitorPlay size={16} /> <span className="hidden sm:inline">Ver</span> Ranking
                </button>
                <button onClick={() => window.open('/ranking', '_blank')} className="bg-blue-800 hover:bg-blue-700 text-blue-200 px-3 py-2 rounded-xl active:scale-95 transition-all" title="Abrir página pública">
                    <ExternalLink size={16} />
                </button>
            </div>
          </div>
          
          <div className="bg-blue-900/50 border border-blue-800 p-4 rounded-xl text-right w-full md:w-auto min-w-[140px] flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end">
            <p className="text-yellow-400 text-[9px] font-bold uppercase tracking-widest md:order-2 md:mt-1">Total Geral</p>
            <span className="text-3xl md:text-4xl font-black text-white leading-none block md:order-1">{inscritosFiltrados.length}</span>
          </div>
        </header>

        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"><Search size={20} /></div>
            <input 
                type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..."
                className="w-full bg-blue-900/40 border border-blue-800 text-white font-bold placeholder:text-blue-500/50 text-base md:text-lg rounded-2xl pl-12 pr-12 py-3 md:py-4 outline-none focus:border-yellow-400 focus:bg-blue-900/60 transition-all uppercase"
            />
            {busca && <button onClick={() => setBusca("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white"><X size={16} /></button>}
        </div>

        <div className="grid gap-3">
            {inscritosFiltrados.length > 0 ? (
                inscritosFiltrados.map((pessoa) => (
                    <div key={pessoa.id} className="bg-blue-900/40 border border-blue-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-blue-900/60 transition-colors">
                        
                        <div className="flex items-start gap-3 w-full">
                            <span className="bg-yellow-400 text-blue-900 text-[10px] font-black px-2 py-1 rounded italic shrink-0 mt-1">#{pessoa.numero_inscricao}</span>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-base md:text-lg uppercase leading-tight truncate">{pessoa.name}</h3>
                                
                                {/* ÁREA DE EDIÇÃO DO TIME */}
                                {editandoId === pessoa.id ? (
                                    <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-left-2">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={novoTime}
                                            onChange={(e) => setNovoTime(e.target.value)}
                                            className="bg-blue-950 border border-yellow-400 text-yellow-400 text-xs font-bold uppercase rounded p-1 w-full outline-none"
                                        />
                                        <button onClick={() => salvarEdicao(pessoa.id)} className="text-green-400 hover:text-green-300 bg-green-900/20 p-1 rounded"><Save size={16}/></button>
                                        <button onClick={cancelarEdicao} className="text-red-400 hover:text-red-300 bg-red-900/20 p-1 rounded"><XCircle size={16}/></button>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase mt-1 ${busca ? "text-yellow-300" : "text-blue-300"}`}>
                                        <Users size={12} /> {padronizarNome(pessoa.team)}
                                        {/* Botão para iniciar edição */}
                                        <button onClick={() => iniciarEdicao(pessoa.id, pessoa.team)} className="ml-2 text-blue-500 hover:text-yellow-400 transition-colors" title="Corrigir nome da equipe">
                                            <Edit size={12} />
                                        </button>
                                    </div>
                                )}
                                
                                <p className="text-blue-500 text-[10px] font-medium truncate mt-0.5">{pessoa.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 border-blue-800/50 pt-3 md:pt-0 mt-1 md:mt-0">
                            <span className={`text-[9px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 border ${
                                pessoa.level === 'Iniciante' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                pessoa.level === 'Intermediário' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                                'bg-red-900/30 text-red-400 border-red-800'
                            }`}>
                                <Activity size={10} /> {pessoa.level}
                            </span>
                            <button onClick={() => handleDelete(pessoa.id, pessoa.name)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-colors border border-red-500/20 active:scale-95" title="Excluir">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 opacity-50 border-2 border-dashed border-blue-800 rounded-3xl"><p className="text-blue-300 font-bold">Ninguém encontrado.</p></div>
            )}
        </div>

        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:text-white mx-auto active:scale-95">
            <ArrowLeft size={14} /> Voltar para o Site
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;