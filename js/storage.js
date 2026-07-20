// ============================================================
// PrazoJus - Módulo de Persistência (localStorage)
// Gerencia o armazenamento local de processos, prazos e config
// ============================================================

const STORAGE_KEYS = {
    PROCESSOS: 'prazojus_processos',
    PRAZOS: 'prazojus_prazos',
    CONFIG: 'prazojus_config',
    FERIADOS_CUSTOM: 'prazojus_feriados_custom'
};

// ============================================================
// Configuração padrão
// ============================================================
const DEFAULT_CONFIG = {
    apiKey: '',
    diasAlertaCritico: 3,
    diasAlertaAtencao: 7,
    mostrarVencidos: true,
    recessoForense: true
};

// ============================================================
// Funções auxiliares de acesso ao localStorage
// ============================================================

function storageGet(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error(`Erro ao ler ${key} do localStorage:`, e);
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Erro ao salvar ${key} no localStorage:`, e);
        showToast('Erro ao salvar dados. Verifique o espaço de armazenamento.', 'error');
        return false;
    }
}

// ============================================================
// PROCESSOS - CRUD
// ============================================================

/** Retorna todos os processos salvos */
function getProcessos() {
    return storageGet(STORAGE_KEYS.PROCESSOS) || [];
}

/** Retorna um processo pelo ID */
function getProcessoById(id) {
    const processos = getProcessos();
    return processos.find(p => p.id === id) || null;
}

/** Retorna um processo pelo número CNJ */
function getProcessoByNumero(numero) {
    const processos = getProcessos();
    const clean = numero.replace(/[^0-9]/g, '');
    return processos.find(p => p.numero.replace(/[^0-9]/g, '') === clean) || null;
}

/** Salva um novo processo */
function saveProcesso(processo) {
    const processos = getProcessos();

    // Verifica duplicata por número
    const existing = processos.find(p =>
        p.numero.replace(/[^0-9]/g, '') === processo.numero.replace(/[^0-9]/g, '')
    );
    if (existing) {
        showToast('Processo já cadastrado!', 'warning');
        return existing;
    }

    const novoProcesso = {
        id: generateId(),
        numero: processo.numero,
        tribunal: processo.tribunal || '',
        tribunalAlias: processo.tribunalAlias || '',
        classe: processo.classe || '',
        classeNome: processo.classeNome || '',
        assuntos: processo.assuntos || [],
        orgaoJulgador: processo.orgaoJulgador || '',
        orgaoJulgadorNome: processo.orgaoJulgadorNome || '',
        partes: processo.partes || [],
        movimentos: processo.movimentos || [],
        status: processo.status || 'ativo',
        observacoes: processo.observacoes || '',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    processos.push(novoProcesso);
    storageSet(STORAGE_KEYS.PROCESSOS, processos);
    return novoProcesso;
}

/** Atualiza um processo existente */
function updateProcesso(id, updates) {
    const processos = getProcessos();
    const index = processos.findIndex(p => p.id === id);

    if (index === -1) {
        showToast('Processo não encontrado.', 'error');
        return null;
    }

    processos[index] = {
        ...processos[index],
        ...updates,
        atualizadoEm: new Date().toISOString()
    };

    storageSet(STORAGE_KEYS.PROCESSOS, processos);
    return processos[index];
}

/** Remove um processo e seus prazos vinculados */
function deleteProcesso(id) {
    let processos = getProcessos();
    processos = processos.filter(p => p.id !== id);
    storageSet(STORAGE_KEYS.PROCESSOS, processos);

    // Remove prazos vinculados
    let prazos = getPrazos();
    prazos = prazos.filter(p => p.processoId !== id);
    storageSet(STORAGE_KEYS.PRAZOS, prazos);

    return true;
}

// ============================================================
// PRAZOS - CRUD
// ============================================================

/** Retorna todos os prazos salvos */
function getPrazos() {
    return storageGet(STORAGE_KEYS.PRAZOS) || [];
}

/** Retorna um prazo pelo ID */
function getPrazoById(id) {
    const prazos = getPrazos();
    return prazos.find(p => p.id === id) || null;
}

/** Retorna prazos de um processo específico */
function getPrazosByProcesso(processoId) {
    const prazos = getPrazos();
    return prazos.filter(p => p.processoId === processoId);
}

/** Salva um novo prazo */
function savePrazo(prazo) {
    const prazos = getPrazos();

    const novoPrazo = {
        id: generateId(),
        processoId: prazo.processoId,
        tipo: prazo.tipo || 'outro',
        tipoDescricao: prazo.tipoDescricao || '',
        baseLegal: prazo.baseLegal || '',
        dataInicio: prazo.dataInicio, // ISO string
        dataFim: prazo.dataFim,       // ISO string
        diasPrazo: prazo.diasPrazo || 0,
        contagem: prazo.contagem || 'uteis', // 'uteis', 'corridos', 'data_fixa'
        status: prazo.status || 'pendente', // 'pendente', 'cumprido', 'perdido'
        observacoes: prazo.observacoes || '',
        criadoEm: new Date().toISOString()
    };

    prazos.push(novoPrazo);
    storageSet(STORAGE_KEYS.PRAZOS, prazos);
    return novoPrazo;
}

/** Atualiza um prazo existente */
function updatePrazo(id, updates) {
    const prazos = getPrazos();
    const index = prazos.findIndex(p => p.id === id);

    if (index === -1) {
        showToast('Prazo não encontrado.', 'error');
        return null;
    }

    prazos[index] = {
        ...prazos[index],
        ...updates
    };

    storageSet(STORAGE_KEYS.PRAZOS, prazos);
    return prazos[index];
}

/** Remove um prazo */
function deletePrazo(id) {
    let prazos = getPrazos();
    prazos = prazos.filter(p => p.id !== id);
    storageSet(STORAGE_KEYS.PRAZOS, prazos);
    return true;
}

/** Marca prazo como cumprido */
function marcarPrazoCumprido(id) {
    return updatePrazo(id, { status: 'cumprido' });
}

/** Marca prazo como pendente */
function marcarPrazoPendente(id) {
    return updatePrazo(id, { status: 'pendente' });
}

// ============================================================
// CONSULTAS E ESTATÍSTICAS
// ============================================================

/** Retorna prazos ordenados por urgência (mais urgente primeiro) */
function getPrazosOrdenados(incluirCumpridos = false) {
    let prazos = getPrazos();

    if (!incluirCumpridos) {
        prazos = prazos.filter(p => p.status !== 'cumprido');
    }

    return prazos.sort((a, b) => {
        const dateA = new Date(a.dataFim);
        const dateB = new Date(b.dataFim);
        return dateA - dateB;
    });
}

/** Retorna estatísticas para o dashboard */
function getDashboardStats() {
    const prazos = getPrazos().filter(p => p.status !== 'cumprido');
    const processos = getProcessos().filter(p => p.status === 'ativo');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let vencidos = 0;
    let urgentes = 0;
    let estaSemana = 0;

    // Calcular fim da semana (domingo)
    const fimSemana = new Date(hoje);
    fimSemana.setDate(fimSemana.getDate() + (7 - fimSemana.getDay()));

    prazos.forEach(prazo => {
        const dataFim = new Date(prazo.dataFim);
        dataFim.setHours(0, 0, 0, 0);

        const diff = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

        if (diff < 0) {
            vencidos++;
        } else if (diff <= 3) {
            urgentes++;
        }

        if (dataFim >= hoje && dataFim <= fimSemana) {
            estaSemana++;
        }
    });

    return {
        vencidos,
        urgentes,
        estaSemana,
        processosAtivos: processos.length
    };
}

/** Retorna prazos de um mês específico para o calendário */
function getPrazosByMonth(year, month) {
    const prazos = getPrazos();
    return prazos.filter(prazo => {
        const date = new Date(prazo.dataFim);
        return date.getFullYear() === year && date.getMonth() === month;
    });
}

/** Retorna prazos de um dia específico */
function getPrazosByDate(dateStr) {
    const prazos = getPrazos();
    return prazos.filter(prazo => {
        const date = new Date(prazo.dataFim);
        const target = new Date(dateStr);
        return date.toDateString() === target.toDateString();
    });
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

/** Retorna a configuração atual */
function getConfig() {
    return storageGet(STORAGE_KEYS.CONFIG) || { ...DEFAULT_CONFIG };
}

/** Salva configuração */
function saveConfig(config) {
    const current = getConfig();
    const updated = { ...current, ...config };
    storageSet(STORAGE_KEYS.CONFIG, updated);
    return updated;
}

/** Retorna a API Key configurada */
function getApiKey() {
    const config = getConfig();
    return config.apiKey || '';
}

/** Salva a API Key */
function saveApiKey(apiKey) {
    return saveConfig({ apiKey });
}

// ============================================================
// FERIADOS CUSTOMIZADOS
// ============================================================

/** Retorna feriados customizados */
function getCustomHolidays() {
    return storageGet(STORAGE_KEYS.FERIADOS_CUSTOM) || [];
}

/** Salva feriados customizados */
function saveCustomHolidays(holidays) {
    storageSet(STORAGE_KEYS.FERIADOS_CUSTOM, holidays);
}

/** Adiciona um feriado customizado */
function addCustomHoliday(date, name) {
    const holidays = getCustomHolidays();
    holidays.push({ date, name });
    saveCustomHolidays(holidays);
    return holidays;
}

/** Remove um feriado customizado */
function removeCustomHoliday(date) {
    let holidays = getCustomHolidays();
    holidays = holidays.filter(h => h.date !== date);
    saveCustomHolidays(holidays);
    return holidays;
}

// ============================================================
// EXPORTAR / IMPORTAR
// ============================================================

/** Exporta todos os dados como JSON */
function exportData() {
    const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        processos: getProcessos(),
        prazos: getPrazos(),
        config: getConfig(),
        feriadosCustom: getCustomHolidays()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prazojus_backup_${formatDate(new Date()).replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Backup exportado com sucesso!', 'success');
}

/** Importa dados de um arquivo JSON */
function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.version || !data.processos || !data.prazos) {
                    throw new Error('Arquivo de backup inválido');
                }

                storageSet(STORAGE_KEYS.PROCESSOS, data.processos);
                storageSet(STORAGE_KEYS.PRAZOS, data.prazos);

                if (data.config) {
                    storageSet(STORAGE_KEYS.CONFIG, data.config);
                }
                if (data.feriadosCustom) {
                    storageSet(STORAGE_KEYS.FERIADOS_CUSTOM, data.feriadosCustom);
                }

                showToast(`Backup importado! ${data.processos.length} processos e ${data.prazos.length} prazos restaurados.`, 'success');
                resolve(data);
            } catch (err) {
                showToast('Erro ao importar: arquivo inválido.', 'error');
                reject(err);
            }
        };

        reader.onerror = () => {
            showToast('Erro ao ler o arquivo.', 'error');
            reject(reader.error);
        };

        reader.readAsText(file);
    });
}

/** Limpa todos os dados (com confirmação) */
function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    showToast('Todos os dados foram apagados.', 'warning');
}
