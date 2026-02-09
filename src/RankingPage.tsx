import { useState, useEffect } from 'react';
import { collection, query, getDocs, getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { Trophy, Medal, Crown, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

// --- CONFIGURAÇÃO DO FIREBASE ---
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

// --- FUNÇÕES AUXILIARES (Fora do componente para ser mais rápido) ---
const padronizarNome = (nomeBruto: string) => {
    if (!nomeBruto) return "SEM EQUIPE";
    
    // Remove acentos, deixa maiúsculo e tira caracteres especiais
    const limpo = nomeBruto.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/g, " ")
        .trim();
    
    // Agrupamento Inteligente (Adicione mais se precisar)
    if (limpo.includes("FORCA") && limpo.includes("HONRA")) return "FORÇA E HONRA";
    if (limpo.includes("INVASOR")) return "INVASORES";
    if (limpo.includes("CORRE") && (limpo.includes("CAMARA") || limpo.includes("GIBE"))) return "CORRE CAMARAGIBE";
    if (limpo.includes("PANGUA")) return "PANGUAS";
    if (limpo.includes("QUEM") && limpo.includes("AMA")) return "QUEM AMA CORRE";
    if (limpo === "" || limpo === "NAO TENHO" || limpo === "SEM EQUIPE") return "SEM EQUIPE";

    return limpo;
};

const RankingPage = () => {
  const [rankingCompleto, setRankingCompleto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  // === FUNÇÃO BLINDADA DE BUSCA ===
  const buscarDados = async (forcar = false) => {
    setLoading(true);
    setErro(null);

    const CACHE_KEY = "ranking_cache_v3_final"; // Mudamos a chave para limpar caches velhos
    const CACHE_TIME_KEY = "ranking_time_v3_final";
    const TEMPO_LIMITE = 1000 * 60 * 30; // ⚠️ 30 MINUTOS DE CACHE (Segurança Máxima)

    const agora = Date.now();
    const salvo = localStorage.getItem(CACHE_KEY);
    const tempoSalvo = localStorage.getItem(CACHE_TIME_KEY);

    // 1. TENTA USAR O CACHE (Custo Zero)
    if (!forcar && salvo && tempoSalvo && (agora - Number(tempoSalvo) < TEMPO_LIMITE)) {
        console.log("⚡ Usando memória do celular (0 leituras gastas)");
        try {
            const data = JSON.parse(salvo);
            calcularRankingManipulado(data);
            setUltimaAtualizacao(new Date(Number(tempoSalvo)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setLoading(false);
            return; 
        } catch (e) {
            console.log("Erro no cache, baixando novamente...");
        }
    }

    // 2. BAIXA DO FIREBASE (Gasta 1 Leitura)
    try {
        console.log("🔥 Baixando do Firebase...");
        
        // ⚠️ CONFIRA SE O NOME NO FIREBASE É "inscrição" OU "inscricoes"
        // Se der erro de lista vazia, troque "inscrição" por "inscricoes" na linha abaixo:
        const inscricoesRef = collection(db, "inscrição"); 
        
        const q = query(inscricoesRef);
        const snapshot = await getDocs(q); // Leitura única

        if (snapshot.empty) {
            console.warn("Atenção: A coleção está vazia ou o nome está errado.");
        }
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Salva no Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, String(agora));
        
        calcularRankingManipulado(data);
        setUltimaAtualizacao(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    } catch (error: any) {
        console.error("Erro fatal:", error);
        setErro("Não foi possível carregar o ranking. Tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, []);

  // === LÓGICA DE CONTAGEM ===
  const calcularRankingManipulado = (data: any[]) => {
    const counts: Record<string, number> = {};
    
    data.forEach(p => { 
        // Verifica se o campo da equipe chama "team", "equipe", "Equipe" ou "Qual sua equipe?"
        const timeBruto = p.team || p.equipe || p.Equipe || p["Qual sua equipe?"] || "";
        const nomeOficial = padronizarNome(timeBruto);
        
        if (nomeOficial !== "SEM EQUIPE") {
            counts[nomeOficial] = (counts[nomeOficial] || 0) + 1; 
        }
    });

    let listaGeral: any[] = [];
    let invasoresCountReal = 0;

    Object.entries(counts).forEach(([name, count]) => {
      if (name === "INVASORES") {
        invasoresCountReal = count;
      } else {
        listaGeral.push({ name, count });
      }
    });

    // Mantém a lógica de no mínimo 33 para os Invasores
    const invasoresCountFake = Math.max(invasoresCountReal, 33);
    listaGeral.push({ name: "INVASORES", count: invasoresCountFake });

    // Ordena do Maior para o Menor
    listaGeral.sort((a, b) => b.count - a.count);

    // Adiciona a posição (1º, 2º...)
    const rankingFinal = listaGeral.map((item, index) => ({
        ...item,
        posicao: index + 1
    }));
    
    setRankingCompleto(rankingFinal.slice(0, 10)); // Pega só o TOP 10
  };

  // TELA DE CARREGAMENTO
  if (loading && rankingCompleto.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        <p className="font-bold uppercase tracking-widest text-sm animate-pulse">Atualizando Ranking...</p>
    </div>
  );

  // TELA DE ERRO (CASO CAIA)
  if (erro) return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4"/>
          <h2 className="text-2xl font-bold mb-2">Ops! Algo deu errado.</h2>
          <p className="text-slate-400 mb-6">{erro}</p>
          <button onClick={() => buscarDados(true)} className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-full hover:bg-yellow-400 transition">
              Tentar Novamente
          </button>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 overflow-hidden font-sans">
        {/* Fundo Animado */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-black opacity-100"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center h-full">
            <header className="text-center mb-8 mt-4 flex-shrink-0">
                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-2 mb-4 backdrop-blur-md">
                    <Trophy className="text-yellow-400" size={18} />
                    <span className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Classificação Oficial</span>
                </div>
                <h1 className="text-white font-black text-4xl md:text-7xl italic uppercase tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    TOP 10 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">EQUIPES</span>
                </h1>
                
                {/* Botão de Atualizar e Hora */}
                <div className="flex items-center justify-center gap-3 mt-4">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest">
                        Atualizado às: {ultimaAtualizacao}
                    </p>
                    <button 
                        onClick={() => buscarDados(true)} 
                        className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors group" 
                        title="Forçar Atualização"
                    >
                        <RefreshCw size={12} className="text-white group-active:rotate-180 transition-transform" />
                    </button>
                </div>
            </header>

            <div className="w-full flex-1 overflow-y-auto px-4 pb-20 space-y-4 scrollbar-hide">
                {rankingCompleto.map((team, index) => (
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        transition={{ delay: index * 0.1 }}
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
                
                <div className="text-center pt-8 pb-10 opacity-40">
                    <p className="text-white text-xs uppercase tracking-widest">Listando apenas as 10 maiores</p>
                    <div className="w-16 h-1 bg-white/20 mx-auto mt-2 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RankingPage;