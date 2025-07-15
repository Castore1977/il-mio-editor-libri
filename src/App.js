import React, { useState, useRef, useCallback, useEffect } from 'react';
// --- MODIFICA: Aggiunta l'icona Maximize ---
import { Plus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Monitor, Smartphone, FileDown, X, GripVertical, BookOpen, Users, MapPin, BarChart2, Upload, Download, Calendar, Home, Book, AlertTriangle, Loader2, LogOut, Maximize } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";

// --- FIREBASE CONFIGURATION (invariato) ---
const firebaseConfig = {
    apiKey: "AIzaSyBHVUJq6uTXyPph8dAyoXDCC_i8CMeGVZU",
    authDomain: "il-mio-editor-libri.firebaseapp.com",
    projectId: "il-mio-editor-libri",
    storageBucket: "il-mio-editor-libri.firebasestorage.app",
    messagingSenderId: "504094176371",
    appId: "1:504094176371:web:9e041cba468c3b8d3f6606",
    measurementId: "G-DLC0JG4NSL"
};

// --- ERROR COMPONENT (invariato) ---
const FirebaseConfigError = () => { /* ... codice invariato ... */ };

// --- FIREBASE INITIALIZATION (invariato) ---
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("Firebase initialization error:", error);
}
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- HELPER FUNCTIONS (invariato) ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const createNewBook = (title) => ({/* ... codice invariato ... */});
const parseDate = (dateString) => {/* ... codice invariato ... */};
const formatDate = (date) => {/* ... codice invariato ... */};
const daysBetween = (date1, date2) => {/* ... codice invariato ... */};

// --- CHILD COMPONENTS (invariati fino a Editor) ---

const AuthScreen = () => { /* ... codice invariato ... */ };
const ConfirmationModal = ({ show, title, message, onConfirm, onCancel, confirmText = "Conferma", confirmColor = "bg-red-600 hover:bg-red-700" }) => { /* ... codice invariato ... */ };
const BookLobby = ({ books, onSelectBook, onCreateBook, onDeleteBook, onExportAll, onImportAll, isLoading, onLogout }) => { /* ... codice invariato ... */ };
const TimelineView = ({ chapters }) => { /* ... codice invariato ... */ };
const Sidebar = ({ projectData, onSelect, selectedItem, onAddChapter, onAddCharacter, onAddPlace, onDragStart, onDragOver, onDrop, onDragEnd, onRemoveChapter, onRemoveParagraph, onAddParagraphToChapter, onRemoveCharacter, onRemovePlace, activeTab, setActiveTab }) => { /* ... codice invariato ... */ };

// --- MODIFICA: Il componente Editor ora accetta 'onEnterConcentrationMode' ---
const Editor = ({ item, onUpdate, onAddParagraph, projectData, onLinkChange, onEnterConcentrationMode }) => {
    const contentRef = useRef(null);

    useEffect(() => {
        if (item?.type === 'paragraph' && contentRef.current) {
            if (contentRef.current.innerHTML !== item.data.content) {
                contentRef.current.innerHTML = item.data.content;
            }
        }
    }, [item]);

    if (!item) {
        return <div className="flex-1 p-8 text-center text-gray-500 flex items-center justify-center"><div><Book size={48} className="mx-auto text-gray-400 mb-4"/><p>Seleziona un elemento dalla barra laterale per iniziare a modificare.</p></div></div>;
    }

    const renderers = {
        chapter: () => (
            <>
                <input key={`title-${item.data.id}`} type="text" defaultValue={item.data.title} onBlur={(e) => onUpdate('title', e.target.value)} placeholder="Titolo del Capitolo" className="text-4xl font-bold w-full bg-transparent focus:outline-none mb-8"/>
                <button onClick={onAddParagraph} className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"><Plus size={16} className="mr-1" /> Aggiungi Paragrafo</button>
            </>
        ),
        paragraph: () => (
            <>
                <div className="flex items-center justify-between mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                    <input key={`title-${item.data.id}`} type="text" defaultValue={item.data.title} onBlur={(e) => onUpdate('title', e.target.value)} placeholder="Titolo del Paragrafo" className="text-2xl font-semibold w-full bg-transparent focus:outline-none"/>
                    {/* --- NUOVO: Pulsante per entrare in modalità concentrazione --- */}
                    <button onClick={() => onEnterConcentrationMode(item)} className="p-2 text-gray-500 hover:text-blue-500" title="Modalità Concentrazione">
                        <Maximize size={20} />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Inizio</label>
                        <input type="date" defaultValue={item.data.startDate || ''} onBlur={(e) => onUpdate('startDate', e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fine</label>
                        <input type="date" defaultValue={item.data.endDate || ''} onBlur={(e) => onUpdate('endDate', e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"/>
                    </div>
                </div>
                <div key={`content-${item.data.id}`} ref={contentRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: item.data.content }} onBlur={(e) => onUpdate('content', e.target.innerHTML)} className="prose dark:prose-invert prose-lg max-w-none w-full focus:outline-none mt-4" style={{ fontFamily: item.data.font || 'Arial', textAlign: item.data.align || 'left' }}/>
                <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* ... resto del componente paragraph invariato ... */}
                </div>
            </>
        ),
        character: () => ( /* ... codice invariato ... */ ),
        place: () => ( /* ... codice invariato ... */ )
    };

    return (
        <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
                {renderers[item.type] ? renderers[item.type]() : null}
            </div>
        </div>
    );
};

const Toolbar = ({ onFontChange, onAlignChange, currentFont, currentAlign, isParagraphSelected }) => { /* --- MODIFICA: Rimosso selectedItem, passato isParagraphSelected --- */
    const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Comic Sans MS'];
    const applyStyle = (command) => document.execCommand(command, false, null);

    return (
        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2 flex-wrap justify-center">
            <button onClick={() => applyStyle('bold')} disabled={!isParagraphSelected} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><Bold size={20} /></button>
            <button onClick={() => applyStyle('italic')} disabled={!isParagraphSelected} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><Italic size={20} /></button>
            <button onClick={() => applyStyle('underline')} disabled={!isParagraphSelected} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><Underline size={20} /></button>
            <div className="h-6 border-l border-gray-300 dark:border-gray-600 mx-2"></div>
            <select onChange={(e) => onFontChange(e.target.value)} value={currentFont} disabled={!isParagraphSelected} className="p-2 rounded bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none disabled:opacity-50 dark:bg-gray-800">
                {fonts.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
            <div className="h-6 border-l border-gray-300 dark:border-gray-600 mx-2"></div>
            <button onClick={() => onAlignChange('left')} disabled={!isParagraphSelected} className={`p-2 rounded ${currentAlign === 'left' ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50`}><AlignLeft size={20} /></button>
            <button onClick={() => onAlignChange('center')} disabled={!isParagraphSelected} className={`p-2 rounded ${currentAlign === 'center' ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50`}><AlignCenter size={20} /></button>
            <button onClick={() => onAlignChange('right')} disabled={!isParagraphSelected} className={`p-2 rounded ${currentAlign === 'right' ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50`}><AlignRight size={20} /></button>
        </div>
    );
};

const ExportModal = ({ show, onClose, chapters, onExport }) => { /* ... codice invariato ... */ };

// --- NUOVO COMPONENTE: ConcentrationEditor ---
const ConcentrationEditor = ({ item, onUpdate, onExit, onFontChange, onAlignChange }) => {
    const contentRef = useRef(null);
    const [currentData, setCurrentData] = useState(item.data);

    useEffect(() => {
        // Popola l'editor con il contenuto iniziale quando il componente si monta
        if (contentRef.current) {
            contentRef.current.innerHTML = currentData.content;
        }
    }, []); // Esegui solo una volta

    const handleBlur = (e) => {
        // Quando l'utente lascia l'area di testo, salva il contenuto
        onUpdate('content', e.target.innerHTML);
    };
    
    // Funzioni wrapper per aggiornare lo stato locale e propagare le modifiche
    const handleLocalFontChange = (font) => {
        setCurrentData(prev => ({ ...prev, font }));
        onFontChange(font);
    };

    const handleLocalAlignChange = (align) => {
        setCurrentData(prev => ({ ...prev, align }));
        onAlignChange(align);
    };

    return (
        <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col">
            <div className="flex-shrink-0">
                 <Toolbar 
                    onFontChange={handleLocalFontChange} 
                    onAlignChange={handleLocalAlignChange} 
                    currentFont={currentData.font} 
                    currentAlign={currentData.align}
                    isParagraphSelected={true}
                 />
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-16 flex justify-center">
                 <div className="max-w-3xl w-full">
                    <h1 className="text-3xl font-bold mb-4 text-gray-700 dark:text-gray-300">{currentData.title}</h1>
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={handleBlur}
                        className="text-xl leading-relaxed prose dark:prose-invert max-w-none w-full focus:outline-none"
                        style={{ fontFamily: currentData.font, textAlign: currentData.align }}
                    />
                </div>
            </div>
            <button onClick={onExit} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white p-2 rounded-full bg-gray-200 dark:bg-gray-800">
                <X size={24} />
            </button>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

export default function App() {
    //
    // --- 1. HOOKS DECLARATIONS ---
    //
    const [user, setUser] = useState(null);
    const [books, setBooks] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeBookId, setActiveBookId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('index');
    // --- MODIFICA: da booleano a stato per l'oggetto paragrafo ---
    const [concentrationModeItem, setConcentrationModeItem] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);
    const [pendingImportData, setPendingImportData] = useState(null);

    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // --- EFFECT HOOKS (invariati) ---
    useEffect(() => { /* ... codice invariato ... */ }, []);
    useEffect(() => { /* ... codice invariato ... */ }, [user]);
    useEffect(() => { /* ... codice invariato ... */ }, []);

    // --- CALLBACK HOOKS (Handlers) ---
    const updateActiveBookData = useCallback(async (updater) => { /* ... codice invariato ... */ }, [activeBookId, user, books]);
    
    // ... Altri handlers invariati ...
    const handleCreateBook = useCallback(async (title) => { /* ... */ }, [user]);
    const handleSelectBook = useCallback((bookId) => { /* ... */ }, []);
    const handleDeleteBook = useCallback(async () => { /* ... */ }, [bookToDelete, user, activeBookId]);
    const handleGoToLobby = useCallback(() => { /* ... */ }, []);
    const handleLogout = useCallback(async () => { /* ... */ }, []);
    const exportAllBooks = useCallback(() => { /* ... */ }, [books]);
    const handleAllBooksImport = useCallback((event) => { /* ... */ }, []);
    const confirmImportAllBooks = useCallback(async () => { /* ... */ }, [pendingImportData, user]);
    const addChapter = useCallback(() => { /* ... */ }, [updateActiveBookData]);
    const removeChapter = useCallback((chapIndex) => { /* ... */ }, [updateActiveBookData]);
    const addParagraph = useCallback((chapIndex) => { /* ... */ }, [updateActiveBookData]);
    const removeParagraph = useCallback((chapIndex, paraIndex) => { /* ... */ }, [updateActiveBookData]);
    const addCharacter = useCallback(() => { /* ... */ }, [updateActiveBookData]);
    const removeCharacter = useCallback((id) => { /* ... */ }, [updateActiveBookData]);
    const addPlace = useCallback(() => { /* ... */ }, [updateActiveBookData]);
    const removePlace = useCallback((id) => { /* ... */ }, [updateActiveBookData]);
    
    const handleUpdateSelectedItem = useCallback((field, value) => {
        if (!selectedItem) return;
        updateActiveBookData(data => {
            const { type, index, chapterIndex, paragraphIndex } = selectedItem;
            let itemToUpdate;
            if (type === 'chapter') itemToUpdate = data.chapters[index];
            else if (type === 'paragraph') itemToUpdate = data.chapters[chapterIndex]?.paragraphs[paragraphIndex];
            else if (type === 'character') itemToUpdate = data.characters[index];
            else if (type === 'place') itemToUpdate = data.places[index];
            if (itemToUpdate) {
                itemToUpdate[field] = value;
            }
            return data;
        });
    }, [selectedItem, updateActiveBookData]);

    const handleLinkChange = useCallback((linkType, linkId) => { /* ... codice invariato ... */ }, [selectedItem, updateActiveBookData]);

    const handleFontChange = useCallback((font) => {
        if (selectedItem?.type !== 'paragraph') return;
        document.execCommand("fontName", false, font);
        handleUpdateSelectedItem('font', font);
    }, [selectedItem, handleUpdateSelectedItem]);

    const handleAlignChange = useCallback((align) => {
        if (selectedItem?.type !== 'paragraph') return;
        handleUpdateSelectedItem('align', align);
    }, [selectedItem, handleUpdateSelectedItem]);

    // --- NUOVI HANDLERS: Specifici per la modalità concentrazione ---
    const handleUpdateConcentrationItem = useCallback((field, value) => {
        if (!concentrationModeItem) return;
        updateActiveBookData(data => {
            const { chapterIndex, paragraphIndex } = concentrationModeItem;
            const paragraphToUpdate = data.chapters[chapterIndex]?.paragraphs[paragraphIndex];
            if (paragraphToUpdate) {
                paragraphToUpdate[field] = value;
            }
            return data;
        });
    }, [concentrationModeItem, updateActiveBookData]);

    const handleConcentrationFontChange = useCallback((font) => {
        if (!concentrationModeItem) return;
        handleUpdateConcentrationItem('font', font);
    }, [concentrationModeItem, handleUpdateConcentrationItem]);

    const handleConcentrationAlignChange = useCallback((align) => {
        if (!concentrationModeItem) return;
        handleUpdateConcentrationItem('align', align);
    }, [concentrationModeItem, handleUpdateConcentrationItem]);

    const handleDragDrop = useCallback((e, dropParams) => { /* ... codice invariato ... */ }, [updateActiveBookData]);
    const exportToPdf = useCallback(async (selection) => { /* ... codice invariato ... */ }, [books, activeBookId]);

    //
    // --- 3. RENDER LOGIC ---
    //
    if (isLoading && !user) { /* ... codice invariato ... */ }
    if (!user) { return <AuthScreen />; }

    if (!activeBookId) {
        return (
            <>
                <ConfirmationModal show={!!bookToDelete} title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare permanentemente il libro "${books[bookToDelete]?.title}"?`} onConfirm={handleDeleteBook} onCancel={() => setBookToDelete(null)} />
                <ConfirmationModal show={!!pendingImportData} title="Conferma Importazione Libreria" message="Stai per SOSTITUIRE la tua intera libreria con il contenuto del file. I dati attuali verranno CANCELLATI." onConfirm={confirmImportAllBooks} onCancel={() => setPendingImportData(null)} confirmText="Sostituisci Tutto" confirmColor="bg-yellow-600 hover:bg-yellow-700" />
                <BookLobby books={books} onSelectBook={handleSelectBook} onCreateBook={handleCreateBook} onDeleteBook={(id) => setBookToDelete(id)} onExportAll={exportAllBooks} onImportAll={handleAllBooksImport} isLoading={isLoading} onLogout={handleLogout} />
            </>
        );
    }
    
    const activeBookData = books[activeBookId]?.data;
    if (!activeBookData) { /* ... codice invariato ... */ }

    const editorItem = selectedItem ? {
        type: selectedItem.type,
        // --- NUOVO: Aggiungo gli indici all'item per passarlo alla modalità concentrazione ---
        chapterIndex: selectedItem.chapterIndex,
        paragraphIndex: selectedItem.paragraphIndex,
        data: selectedItem.type === 'chapter' ? activeBookData.chapters[selectedItem.index]
            : selectedItem.type === 'paragraph' ? activeBookData.chapters[selectedItem.chapterIndex]?.paragraphs[selectedItem.paragraphIndex]
            : selectedItem.type === 'character' ? activeBookData.characters[selectedItem.index]
            : activeBookData.places[selectedItem.index]
    } : null;

    const currentParagraphStyle = (selectedItem?.type === 'paragraph' && editorItem?.data) || { font: 'Arial', align: 'left' };

    // --- MODIFICA: Logica di rendering per la nuova modalità concentrazione ---
    if (concentrationModeItem) {
        return (
            <ConcentrationEditor
                item={concentrationModeItem}
                onUpdate={handleUpdateConcentrationItem}
                onExit={() => setConcentrationModeItem(null)}
                onFontChange={handleConcentrationFontChange}
                onAlignChange={handleConcentrationAlignChange}
            />
        );
    }
    
    return (
        <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
            <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} chapters={activeBookData.chapters} onExport={exportToPdf} />
            <Sidebar /* ... props invariate ... */ />
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={handleGoToLobby} title="Torna alla scelta dei libri" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Home size={20} /> <span className="hidden md:inline">Lobby</span>
                    </button>
                    <div className="text-center font-bold truncate px-4">
                        <Book size={16} className="inline-block mr-2" />
                        {books[activeBookId].title}
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                         <button onClick={() => setShowExportModal(true)} disabled={!scriptsLoaded || isExporting} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <FileDown size={20} /> <span className="hidden md:inline">{isExporting ? 'Esportazione...' : (scriptsLoaded ? 'Esporta PDF' : 'Caricamento...')}</span>
                        </button>
                        {/* --- MODIFICA: Questo pulsante ora non fa nulla, l'attivazione è per paragrafo. Si potrebbe rimuovere o dargli un'altra funzione. Per ora lo lascio disabilitato. --- */}
                        <button disabled className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-50 cursor-not-allowed">
                            <Monitor size={20} /> <span className="hidden md:inline">Concentrazione</span>
                        </button>
                    </div>
                </div>
                <Toolbar 
                    onFontChange={handleFontChange} 
                    onAlignChange={handleAlignChange} 
                    currentFont={currentParagraphStyle.font} 
                    currentAlign={currentParagraphStyle.align} 
                    isParagraphSelected={selectedItem?.type === 'paragraph'}
                />
                <Editor 
                    item={editorItem} 
                    projectData={activeBookData} 
                    onUpdate={handleUpdateSelectedItem} 
                    onAddParagraph={() => addParagraph(selectedItem.index)} 
                    onLinkChange={handleLinkChange}
                    onEnterConcentrationMode={setConcentrationModeItem} 
                />
            </div>
        </div>
    );
}