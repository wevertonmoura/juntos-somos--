import { useState, useEffect } from 'react';
import { collection, query, getDocs, getFirestore, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { initializeApp } from "firebase/app";
import { Trophy, Activity, ArrowLeft, Search, Users, X, RotateCcw, Trash2, MonitorPlay, Medal, Crown, ExternalLink, Edit, Save, XCircle, Lock, BarChart3, Copy, Check, Download, AlertTriangle } from 'lucide-react';
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
  // === ESTADOS DE AUTENTICAÇÃO ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputSenha, setInputSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  // === ESTADOS DO PAINEL ===
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modoTV, setModoTV] = useState(false);
  const [rankingCompleto, setRankingCompleto] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiado, setCopiado] = useState(false);
  
  // === MODO DETETIVE ===
  const [modoDetetive, setModoDetetive] = useState(false);

  // Estados para Edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoTime, setNovoTime] = useState("");

  // === FUNÇÃO DE LOGIN ===
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSenha === "85113257") {
        setIsAuthenticated(true);
    } else {
        setErroSenha(true);
        setInputSenha("");
        setTimeout(() => setErroSenha(false), 2000);
    }
  };

  // === BUSCAR DADOS (ECONOMIA DE COTA) ===
  const buscarDados = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
        console.log("🔥 Baixando lista atualizada...");
        const inscricoesRef = collection(db, "inscrição");
        const q = query(inscricoesRef);
        const snapshot = await getDocs(q); 
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const ordenados = data.sort((a, b) => {
            const numA = Number(a.numero_inscricao) || 0;
            const numB = Number(b.numero_inscricao) || 0;
            return numB - numA;
        });
        
        setInscritos(ordenados);
        calcularRankingManipulado(data);
    } catch (error) {
        console.error("Erro ao buscar:", error);
        alert("Erro ao buscar dados. Verifique sua conexão.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, [refreshKey, isAuthenticated]);

  // === PADRONIZADOR DE NOMES ===
  const padronizarNome = (nomeBruto: string) => {
    if (!nomeBruto) return "SEM EQUIPE";
    const limpo = nomeBruto.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, ' ') // Tira espaços duplos
        .trim();
    
    if (limpo.includes("FORCA") && limpo.includes("HONRA")) return "FORÇA E HONRA";
    if (limpo.includes("INVASOR")) return "INVASORES";
    if (limpo.includes("CORRE") && (limpo.includes("CAMARA") || limpo.includes("GIBE"))) return "CORRE CAMARAGIBE";
    if (limpo.includes("PANGUA")) return "PANGUAS";
    if (limpo.includes("QUEM") && limpo.includes("AMA")) return "QUEM AMA CORRE";
    if (limpo.includes("AGUIAS") && limpo.includes("MOVIMENTO")) return "AGUIAS EM MOVIMENTO";
    if (limpo === "" || limpo === "NAO TENHO") return "SEM EQUIPE";
    
    return limpo;
  };

  // === LÓGICA DO RANKING ===
  const calcularRankingManipulado = (data: any[]) => {
    const counts: Record<string, number> = {};
    
    data.forEach(p => { 
        const timeBruto = p.team || p.equipe || p["Qual sua equipe?"] || "";
        const nomeOficial = padronizarNome(timeBruto); 
        if (nomeOficial !== "SEM EQUIPE") {
            counts[nomeOficial] = (counts[nomeOficial] || 0) + 1; 
        }
    });

    let listaGeral: any[] = [];
    let invasoresCountReal = 0;

    Object.entries(counts).forEach(([name, count]) => {
      if (name === "INVASORES") { invasoresCountReal = count; } else { listaGeral.push({ name, count }); }
    });

    const invasoresCountFake = Math.max(invasoresCountReal, 33);
    listaGeral.push({ name: "INVASORES", count: invasoresCountFake });
    listaGeral.sort((a, b) => b.count - a.count);

    const rankingFinal = listaGeral.map((item, index) => ({ ...item, posicao: index + 1 }));
    setRankingCompleto(rankingFinal); 
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Numero,Nome,Equipe,Nivel,Telefone,Email,Saude\n"; 
    
    inscritos.forEach((p) => {
        const saude = p.health_details && p.health_details !== "N/A" ? p.health_details.replace(/,/g, " ") : "OK";
        const nome = p.name ? p.name.replace(/,/g, " ") : "";
        const equipe = p.team ? p.team.replace(/,/g, " ") : "";
        
        const linha = `${p.numero_inscricao},"${nome}","${equipe}",${p.level},"${p.phone || ""}",${p.email},"${saude}"`;
        csvContent += linha + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lista_invasores_completa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmails = () => {
    const listaParaCopiar = inscritosFiltrados.length > 0 ? inscritosFiltrados : inscritos;
    const emails = listaParaCopiar
        .map(p => p.email)
        .filter(email => email && email.includes('@'))
        .join('; ');

    navigator.clipboard.writeText(emails);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`⚠️ TEM CERTEZA?\n\nIsso vai excluir permanentemente a inscrição de:\n${nome}`)) {
        try { 
            await deleteDoc(doc(db, "inscrição", id)); 
            const novaLista = inscritos.filter(p => p.id !== id);
            setInscritos(novaLista);
            calcularRankingManipulado(novaLista); 
            alert("Excluído com sucesso!"); 
        } 
        catch (error) { alert("Erro ao excluir. Tente novamente."); }
    }
  };

  const iniciarEdicao = (id: string, timeAtual: string) => { 
      setEditandoId(id); 
      setNovoTime(timeAtual); 
  };
  
  const cancelarEdicao = () => { 
      setEditandoId(null); 
      setNovoTime(""); 
  };
  
  const salvarEdicao = async (id: string) => {
    if (!novoTime.trim()) return;
    try {
        const timeFormatado = novoTime.toUpperCase();
        const docRef = doc(db, "inscrição", id);
        await updateDoc(docRef, { team: timeFormatado });
        
        const novaLista = inscritos.map(p => p.id === id ? { ...p, team: timeFormatado } : p);
        setInscritos(novaLista);
        calcularRankingManipulado(novaLista);
        setEditandoId(null);
    } catch (error) { alert("Erro ao atualizar equipe."); }
  };

  const stats = {
    total: inscritos.length,
    iniciante: inscritos.filter(i => i.level === 'Iniciante').length,
    intermediario: inscritos.filter(i => i.level === 'Intermediário').length,
    avancado: inscritos.filter(i => i.level === 'Avançado').length
  };

  // === FILTRO COM MODO DETETIVE + BARRA DE PESQUISA JUNTOS ===
  const inscritosFiltrados = inscritos.filter((item) => {
    
    // 1. SE O DETETIVE ESTIVER LIGADO, ESCONDE QUEM NÃO É FRAUDE
    if (modoDetetive) {
        const nomeAtualCompleto = (item.name || "").trim().toUpperCase();
        const primeiroNomeAtual = nomeAtualCompleto.split(" ")[0]; 
        const equipeAtual = padronizarNome(item.team);
        const nivelAtual = (item.level || "").trim().toUpperCase();

        const copias = inscritos.filter(i => {
            const nomeTeste = (i.name || "").trim().toUpperCase();
            const primeiroNomeTeste = nomeTeste.split(" ")[0];
            const equipeTeste = padronizarNome(i.team);
            const nivelTeste = (i.level || "").trim().toUpperCase();

            return (
                primeiroNomeTeste === primeiroNomeAtual && 
                equipeTeste === equipeAtual && 
                nivelTeste === nivelAtual
            );
        });
        
        // Se a pessoa NÃO tiver cópia, a gente já esconde ela da tela
        if (copias.length <= 1) {
            return false; 
        }
    }

    // 2. APLICA A BARRA DE PESQUISA (Para você filtrar uma equipe por vez)
    if (!busca) return true;
    
    const termo = padronizarNome(busca); 
    const equipe = padronizarNome(item.team);
    const nome = (item.name || "").toUpperCase();
    const nivel = padronizarNome(item.level || "");
    const email = (item.email || "").toUpperCase();
    
    return equipe.includes(termo) || nome.includes(termo.replace(" ", "")) || nivel.includes(termo) || email.includes(termo);
  });

  const filtrarPorNivel = (nivel: string) => {
    if (busca === nivel.toUpperCase()) { setBusca(""); } else { setBusca(nivel.toUpperCase()); }
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-black"></div>
            <div className="relative z-10 w-full max-w-sm bg-blue-900/20 border border-blue-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 text-yellow-400"><Lock size={32} /></div>
                </div>
                <h2 className="text-center text-white font-black text-2xl uppercase italic mb-1">Área Restrita</h2>
                <form onSubmit={handleLogin} className="space-y-4 mt-8">
                    <input autoFocus type="password" placeholder="Senha de Acesso" value={inputSenha} onChange={(e) => setInputSenha(e.target.value)} className="w-full bg-blue-950/50 border border-blue-800 text-white py-4 rounded-xl text-center font-bold tracking-widest outline-none focus:border-yellow-400" />
                    <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-4 rounded-xl uppercase tracking-wider">Entrar</button>
                </form>
                {erroSenha && <p className="text-red-400 text-center text-xs font-bold uppercase mt-4 animate-pulse">Senha Incorreta</p>}
                <button onClick={() => window.location.href = '/'} className="w-full mt-6 text-blue-500/50 hover:text-white text-[10px] font-bold uppercase tracking-widest">Voltar ao Site</button>
            </div>
        </div>
    );
  }

  if (loading && inscritos.length === 0) return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center text-white space-y-4">
          <RotateCcw className="animate-spin text-yellow-400" size={40}/> 
          <p className="font-bold tracking-widest animate-pulse">CARREGANDO LISTA...</p>
      </div>
  );

  if (modoTV) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center p-4 overflow-hidden font-sans z-[9999]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-black opacity-100"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <button onClick={() => setModoTV(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors z-50"><X size={40} strokeWidth={1.5} /></button>
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center h-full">
            <header className="text-center mb-8 mt-4 flex-shrink-0">
                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-2 mb-4 backdrop-blur-md">
                    <Trophy className="text-yellow-400" size={18} />
                    <span className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Classificação Oficial</span>
                </div>
                <h1 className="text-white font-black text-4xl md:text-7xl italic uppercase tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">RANKING <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">DAS EQUIPES</span></h1>
            </header>
            <div className="w-full flex-1 overflow-y-auto px-4 pb-20 space-y-4 scrollbar-hide">
                {rankingCompleto.map((team, index) => (
                    <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.1 }} key={index} className={`relative flex items-center justify-between p-4 rounded-2xl shadow-xl transition-all ${team.posicao === 1 ? "bg-gradient-to-r from-yellow-500 to-yellow-300 border-2 border-yellow-200 shadow-yellow-500/20 scale-105 z-30" : team.posicao === 2 ? "bg-gradient-to-r from-slate-300 to-slate-100 border-2 border-white scale-100 z-20" : team.posicao === 3 ? "bg-gradient-to-r from-orange-600 to-orange-400 border-2 border-orange-300 scale-100 z-10" : "bg-slate-800/80 border border-slate-700 backdrop-blur-sm text-slate-300"}`}>
                        <div className="flex items-center gap-4 md:gap-6 relative z-10">
                            <div className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-xl shadow-inner shrink-0 ${team.posicao === 1 ? "bg-yellow-600 text-white" : team.posicao === 2 ? "bg-slate-400 text-white" : team.posicao === 3 ? "bg-orange-800 text-white" : "bg-slate-900 text-slate-500"}`}>{team.posicao === 1 ? <Crown size={32} fill="currentColor"/> : team.posicao <= 3 ? <Medal size={32} /> : <span className="text-xl md:text-2xl font-black">{team.posicao}º</span>}</div>
                            <div className="flex flex-col"><h2 className={`font-black text-lg md:text-3xl uppercase tracking-tight leading-none ${team.posicao <= 3 ? "text-slate-900" : "text-white"}`}>{team.name}</h2>{team.posicao === 1 && <span className="text-[10px] font-black uppercase tracking-widest text-yellow-900 mt-1">Líder do Evento</span>}</div>
                        </div>
                        <div className={`text-right min-w-[80px] relative z-10 ${team.posicao <= 3 ? "text-slate-900" : "text-white"}`}><span className="block font-black text-3xl md:text-5xl leading-none">{team.count}</span><span className={`text-[9px] font-bold uppercase tracking-wider ${team.posicao <= 3 ? "opacity-70" : "opacity-40"}`}>Inscritos</span></div>
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
        
        <header className="space-y-6 border-b border-blue-800 pb-8 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1"><Trophy size={24} /><h1 className="font-black text-2xl md:text-3xl uppercase italic tracking-tighter">Painel ADM</h1></div>
                    <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Gestão de Equipes</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start">
                    <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-green-600/20 active:scale-95 transition-all"><Download size={16} /> Planilha</button>
                    <button onClick={handleCopyEmails} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 transition-all">{copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado!" : "E-mails"}</button>
                    
                    {/* BOTÃO DETETIVE */}
                    <button onClick={() => setModoDetetive(!modoDetetive)} className={`px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all ${modoDetetive ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        🕵️ {modoDetetive ? "Sair do Detetive" : "Achar Fraudes"}
                    </button>

                    <button onClick={handleRefresh} title="Atualizar Agora" className="bg-blue-900 p-2 rounded-xl active:scale-95 group"><RotateCcw size={20} className="group-hover:rotate-180 transition-transform text-blue-200" /></button>
                    <button onClick={() => setModoTV(true)} className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95 transition-all"><MonitorPlay size={16} /> <span className="hidden sm:inline">Ver</span> Ranking</button>
                    <button onClick={() => window.open('/ranking', '_blank')} className="bg-blue-800 hover:bg-blue-700 text-blue-200 px-3 py-2 rounded-xl active:scale-95 transition-all"><ExternalLink size={16} /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div onClick={() => setBusca("")} className="bg-blue-900/50 border border-blue-800 p-4 rounded-xl flex flex-col justify-center cursor-pointer hover:bg-blue-900 transition-colors">
                    <p className="text-blue-300 text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10}/> Total Geral</p>
                    <span className="text-3xl font-black text-white leading-none">{stats.total}</span>
                </div>
                <div onClick={() => filtrarPorNivel('Iniciante')} className={`bg-green-900/20 border border-green-800/50 p-4 rounded-xl flex flex-col justify-center cursor-pointer hover:bg-green-900/40 transition-colors ${busca === 'INICIANTE' ? 'ring-2 ring-green-400' : ''}`}>
                    <p className="text-green-400 text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={10}/> Iniciantes</p>
                    <span className="text-3xl font-black text-green-100 leading-none">{stats.iniciante}</span>
                </div>
                <div onClick={() => filtrarPorNivel('Intermediário')} className={`bg-orange-900/20 border border-orange-800/50 p-4 rounded-xl flex flex-col justify-center cursor-pointer hover:bg-orange-900/40 transition-colors ${busca === 'INTERMEDIÁRIO' ? 'ring-2 ring-orange-400' : ''}`}>
                    <p className="text-orange-400 text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><BarChart3 size={10}/> Intermediário</p>
                    <span className="text-3xl font-black text-orange-100 leading-none">{stats.intermediario}</span>
                </div>
                <div onClick={() => filtrarPorNivel('Avançado')} className={`bg-red-900/20 border border-red-800/50 p-4 rounded-xl flex flex-col justify-center cursor-pointer hover:bg-red-900/40 transition-colors ${busca === 'AVANÇADO' ? 'ring-2 ring-red-400' : ''}`}>
                    <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Medal size={10}/> Avançados</p>
                    <span className="text-3xl font-black text-red-100 leading-none">{stats.avancado}</span>
                </div>
            </div>
        </header>

        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"><Search size={20} /></div>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="w-full bg-blue-900/40 border border-blue-800 text-white font-bold placeholder:text-blue-500/50 text-base md:text-lg rounded-2xl pl-12 pr-12 py-3 md:py-4 outline-none focus:border-yellow-400 focus:bg-blue-900/60 transition-all uppercase"/>
            {busca && <button onClick={() => setBusca("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white"><X size={16} /></button>}
        </div>

        <div className="grid gap-3">
            {inscritosFiltrados.length > 0 ? (
                inscritosFiltrados.map((pessoa) => (
                    <div key={pessoa.id} className="bg-blue-900/40 border border-blue-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-blue-900/60 transition-colors">
                        <div className="flex items-start gap-3 w-full">
                            <span className="bg-yellow-400 text-blue-900 text-[10px] font-black px-2 py-1 rounded italic shrink-0 mt-1">#{pessoa.numero_inscricao}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-base md:text-lg uppercase leading-tight truncate">{pessoa.name}</h3>
                                    {pessoa.health_details && pessoa.health_details !== "N/A" && pessoa.health_details !== "" && (
                                        <div className="text-red-500 animate-pulse" title={`Saúde: ${pessoa.health_details}`}><AlertTriangle size={18} /></div>
                                    )}
                                </div>
                                {editandoId === pessoa.id ? (
                                    <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-left-2">
                                        <input autoFocus type="text" value={novoTime} onChange={(e) => setNovoTime(e.target.value)} className="bg-blue-950 border border-yellow-400 text-yellow-400 text-xs font-bold uppercase rounded p-1 w-full outline-none"/>
                                        <button onClick={() => salvarEdicao(pessoa.id)} className="text-green-400 hover:text-green-300 bg-green-900/20 p-1 rounded"><Save size={16}/></button>
                                        <button onClick={cancelarEdicao} className="text-red-400 hover:text-red-300 bg-red-900/20 p-1 rounded"><XCircle size={16}/></button>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase mt-1 ${busca ? "text-yellow-300" : "text-blue-300"}`}><Users size={12} /> {padronizarNome(pessoa.team)}<button onClick={() => iniciarEdicao(pessoa.id, pessoa.team)} className="ml-2 text-blue-500 hover:text-yellow-400 transition-colors"><Edit size={12} /></button></div>
                                )}
                                <p className="text-blue-500 text-[10px] font-medium truncate mt-0.5">{pessoa.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 border-blue-800/50 pt-3 md:pt-0 mt-1 md:mt-0">
                            <span className={`text-[9px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 border ${pessoa.level === 'Iniciante' ? 'bg-green-900/30 text-green-400 border-green-800' : pessoa.level === 'Intermediário' ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}><Activity size={10} /> {pessoa.level}</span>
                            <button onClick={() => handleDelete(pessoa.id, pessoa.name)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-colors border border-red-500/20 active:scale-95"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))
            ) : (<div className="text-center py-12 opacity-50 border-2 border-dashed border-blue-800 rounded-3xl"><p className="text-blue-300 font-bold">Nenhum inscrito ou fraude encontrada.</p></div>)}
        </div>
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:text-white mx-auto active:scale-95"><ArrowLeft size={14} /> Voltar para o Site</button>
      </div>
    </div>
  );
};

export default AdminPanel;