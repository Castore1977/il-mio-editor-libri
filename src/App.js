import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, FileDown, X, GripVertical, BookOpen, Users, MapPin, BarChart2, Upload, Download, Calendar, Home, Book, AlertTriangle, Loader2, LogOut, Maximize, Circle, CircleDot, CircleCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// ATTENZIONE: Queste chiavi sono di esempio e non funzioneranno.
// Sostituiscile con le tue chiavi Firebase reali.
const firebaseConfig = {
    apiKey: "AIzaSyBHVUJq6uTXyPph8dAyoXDCC_i8CMeGVZU",
    authDomain: "il-mio-editor-libri.firebaseapp.com",
    projectId: "il-mio-editor-libri",
    storageBucket: "il-mio-editor-libri.firebasestorage.app",
    messagingSenderId: "504094176371",
    appId: "1:504094176371:web:9e041cba468c3b8d3f6606",
    measurementId: "G-DLC0JG4NSL"
};

// --- FIREBASE INITIALIZATION ---
let app;
let auth;
let db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// --- STATI DI AVANZAMENTO ---
const STATUSES = {
    da_iniziare: { label: 'Da Iniziare', color: 'text-red-500', Icon: Circle },
    in_stesura: { label: 'In Stesura', color: 'text-yellow-500', Icon: CircleDot },
    draft: { label: 'Draft', color: 'text-blue-500', Icon: CircleDot },
    completo: { label: 'Completo', color: 'text-green-500', Icon: CircleCheck },
};
const STATUS_HIERARCHY = ['da_iniziare', 'in_stesura', 'draft', 'completo'];

// --- HELPER FUNCTIONS ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createNewBook = (title) => ({
    id: generateId(),
    title: title || "Nuovo Libro",
    lastModified: Date.now(),
    data: {
        chapters: [{ id: generateId(), title: 'Introduzione', paragraphs: [{ id: generateId(), title: 'Primo Paragrafo', content: 'Inizia a scrivere qui...', font: 'Arial', align: 'left', linkedCharacterIds: [], linkedPlaceIds: [], startDate: '', endDate: '', status: 'da_iniziare', notes: '' }] }],
        characters: [{ id: generateId(), name: 'Protagonista', nickname: 'Eroe', bio: 'Nato il...', notes: 'Nessuna nota', font: 'Arial', align: 'left' }],
        places: [{ id: generateId(), name: 'Città Iniziale', description: 'Una ridente cittadina.', font: 'Arial', align: 'left' }]
    }
});

const parseDate = (dateString) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatDate = (date) => {
    if (!date) return 'N/D';
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const daysBetween = (date1, date2) => {
    if (!date1 || !date2) return 0;
    return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
};

const calculateChapterStatus = (chapter) => {
    if (!chapter.paragraphs || chapter.paragraphs.length === 0) {
        return 'da_iniziare';
    }
    const paragraphStatuses = chapter.paragraphs.map(p => p.status || 'da_iniziare');
    if (paragraphStatuses.every(s => s === 'completo')) {
        return 'completo';
    }
    const minStatusIndex = Math.min(...paragraphStatuses.map(s => STATUS_HIERARCHY.indexOf(s)));
    return STATUS_HIERARCHY[minStatusIndex];
};

const calculateBookStatus = (bookData) => {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        return 'da_iniziare';
    }
    const chapterStatuses = bookData.chapters.map(c => calculateChapterStatus(c));
    if (chapterStatuses.every(s => s === 'completo')) {
        return 'completo';
    }
    const minStatusIndex = Math.min(...chapterStatuses.map(s => STATUS_HIERARCHY.indexOf(s)));
    return STATUS_HIERARCHY[minStatusIndex];
};


// --- COMPONENTI ---

const AuthScreen = ({auth}) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            switch(err.code) {
                case 'auth/invalid-email':
                    setError('Formato email non valido.');
                    break;
                case 'auth/user-not-found':
                case 'auth/invalid-credential':
                    setError('Credenziali non valide. Controlla email e password.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Questa email è già stata registrata.');
                    break;
                case 'auth/weak-password':
                    setError('La password deve essere di almeno 6 caratteri.');
                    break;
                default:
                    setError('Si è verificato un errore. Riprova.');
            }
            console.error("Auth error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">{isLoginView ? 'Accedi' : 'Registrati'}</h1>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-6">per gestire i tuoi libri</p>
                    <form onSubmit={handleAuthAction}>
                        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">Password</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center">
                            {loading && <Loader2 className="animate-spin mr-2" size={20} />}
                            {isLoginView ? 'Accedi' : 'Crea Account'}
                        </button>
                    </form>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                        {isLoginView ? "Non hai un account?" : "Hai già un account?"}
                        <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-blue-500 hover:underline ml-1">
                            {isLoginView ? 'Registrati' : 'Accedi'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ show, title, message, onConfirm, onCancel, confirmText = "Conferma", confirmColor = "bg-red-600 hover:bg-red-700" }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm mx-4">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="text-red-500 mr-3 flex-shrink-0" size={24} />
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Annulla</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded text-white ${confirmColor}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const BookLobby = ({ books, onSelectBook, onCreateBook, onDeleteBook, onExportAll, onImportAll, isLoading, onLogout }) => {
    const [newBookTitle, setNewBookTitle] = useState('');
    const importFileRef = useRef(null);
    const handleCreate = () => {
        if (newBookTitle.trim()) {
            onCreateBook(newBookTitle.trim());
            setNewBookTitle('');
        }
    };
    const handleImportClick = () => {
        importFileRef.current.click();
    };
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center">
                <Loader2 className="animate-spin text-blue-500" size={64} />
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
             <div className="absolute top-4 right-4">
                    <button onClick={onLogout} className="p-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2">
                        <LogOut size={16} /> Logout
                    </button>
             </div>
            <div className="w-full max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-8">I Tuoi Libri</h1>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Crea o Gestisci</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} placeholder="Titolo del nuovo libro..." className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyPress={(e) => e.key === 'Enter' && handleCreate()} />
                        <button onClick={handleCreate} className="p-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Plus size={16} /> Crea
                        </button>
                    </div>
                     <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
                        <input type="file" ref={importFileRef} onChange={onImportAll} className="hidden" accept=".json"/>
                        <button onClick={handleImportClick} className="p-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center justify-center gap-2">
                            <Upload size={16} /> Importa Libreria
                        </button>
                        <button onClick={onExportAll} className="p-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2">
                            <Download size={16} /> Esporta Tutta la Libreria
                        </button>
                    </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-4 text-center sm:text-left">Apri un Progetto Esistente</h2>
                    {Object.values(books).length > 0 ? (
                        Object.values(books).sort((a, b) => b.lastModified - a.lastModified).map(book => {
                            const bookStatusKey = calculateBookStatus(book.data);
                            const bookStatus = STATUSES[bookStatusKey];
                            return (
                                <div key={book.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md group gap-4">
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{book.title}</h3>
                                        <p className="text-sm text-gray-500">Ultima modifica: {new Date(book.lastModified).toLocaleString('it-IT')}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <bookStatus.Icon size={16} className={bookStatus.color} />
                                            <span className={`text-sm font-semibold ${bookStatus.color}`}>{bookStatus.label}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                         <button onClick={() => onSelectBook(book.id)} className="p-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apri</button>
                                         <button onClick={() => onDeleteBook(book.id)} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 opacity-50 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-gray-500 py-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <p>Non hai ancora nessun libro. Creane uno per iniziare!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TimelineView = ({ chapters, onSelectParagraph, onExit }) => {
    const allParagraphs = chapters.flatMap(c => c.paragraphs);
    const validParagraphs = allParagraphs.filter(p => p.startDate && p.endDate && parseDate(p.startDate) && parseDate(p.endDate));
    
    if (validParagraphs.length === 0) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col items-center justify-center text-gray-500 p-4">
                 <button onClick={onExit} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={24} />
                </button>
                <Calendar size={48} className="mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Timeline Vuota</h2>
                <p>Nessun paragrafo con date valide da mostrare nella timeline.</p>
                <p className="text-sm mt-1">Aggiungi una data di inizio e fine a un paragrafo per vederlo qui.</p>
            </div>
        );
    }

    const allDates = validParagraphs.flatMap(p => [parseDate(p.startDate), parseDate(p.endDate)]);
    const projectStartDate = new Date(Math.min(...allDates));
    const projectEndDate = new Date(Math.max(...allDates));
    projectEndDate.setDate(projectEndDate.getDate() + 1);
    const totalDuration = daysBetween(projectStartDate, projectEndDate);

    if (totalDuration <= 0) {
        return <div className="p-4 text-center text-gray-500">La durata del progetto non è valida.</div>;
    }

    const monthHeaders = [];
    let currentDate = new Date(projectStartDate);
    while (currentDate <= projectEndDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const daysInMonth = daysBetween(monthStart, nextMonthStart);
        const offset = daysBetween(projectStartDate, monthStart);
        const width = (daysInMonth / totalDuration) * 100;
        monthHeaders.push({
            label: monthStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            offset: Math.max(0, (offset / totalDuration) * 100),
            width: width,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col p-4 sm:p-6 md:p-8">
            <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Timeline del Progetto</h1>
                <button onClick={onExit} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="space-y-6">
                    <div className="relative h-10 border-b-2 border-gray-300 dark:border-gray-600">
                        {monthHeaders.map((month, index) => (
                            <div key={index} className="absolute top-0 h-full flex items-center justify-center border-r border-gray-200 dark:border-gray-700" style={{ left: `${month.offset}%`, width: `${month.width}%` }}>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate px-1">{month.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {chapters.map((chapter, cIndex) => {
                            const chapterParagraphs = chapter.paragraphs.filter(p => p.startDate && p.endDate && parseDate(p.startDate) && parseDate(p.endDate));
                            if (chapterParagraphs.length === 0) return null;
                            const chapterDates = chapterParagraphs.flatMap(p => [parseDate(p.startDate), parseDate(p.endDate)]);
                            const chapterStartDate = new Date(Math.min(...chapterDates));
                            const chapterEndDate = new Date(Math.max(...chapterDates));
                            return (
                                <div key={chapter.id}>
                                    <h3 className="font-bold mb-2 text-gray-700 dark:text-gray-300">{chapter.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{`Dal ${formatDate(chapterStartDate)} al ${formatDate(chapterEndDate)}`}</p>
                                    <div className="space-y-1">
                                        {chapterParagraphs.map((p, pIndex) => {
                                            const pStart = parseDate(p.startDate);
                                            const pEnd = parseDate(p.endDate);
                                            if (!pStart || !pEnd) return null;
                                            const offset = (daysBetween(projectStartDate, pStart) / totalDuration) * 100;
                                            const duration = Math.max(1, daysBetween(pStart, pEnd) + 1);
                                            const width = (duration / totalDuration) * 100;
                                            return (
                                                <div 
                                                    key={p.id} 
                                                    className="w-full h-8 group relative"
                                                    onDoubleClick={() => onSelectParagraph(cIndex, pIndex)}
                                                >
                                                    <div className="absolute h-full bg-blue-500 hover:bg-blue-700 rounded-md transition-all cursor-pointer" style={{ left: `${offset}%`, width: `${width}%` }}>
                                                        <span className="text-white text-xs font-medium truncate px-2 leading-8">{p.title}</span>
                                                        <div className="absolute bottom-full mb-2 w-max p-2 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                            {p.title}<br/>
                                                            {formatDate(pStart)} - {formatDate(pEnd)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Sidebar = ({ projectData, onSelect, selectedItem, onAddChapter, onAddCharacter, onAddPlace, onDragStart, onDragOver, onDrop, onDragEnd, onRemoveChapter, onRemoveParagraph, onAddParagraphToChapter, onRemoveCharacter, onRemovePlace, activeTab, setActiveTab, onShowTimeline }) => {
    const renderIndex = () => (
        <>
            {projectData.chapters.map((chapter, cIndex) => {
                const chapterStatusKey = calculateChapterStatus(chapter);
                const chapterStatus = STATUSES[chapterStatusKey];
                return (
                    <div key={chapter.id} className="mb-1" draggable onDragStart={(e) => onDragStart(e, { type: 'chapter', chapterIndex: cIndex })} onDragOver={onDragOver} onDrop={(e) => onDrop(e, { type: 'chapter', chapterIndex: cIndex })} onDragEnd={onDragEnd}>
                        <div onClick={() => onSelect({ type: 'chapter', index: cIndex })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'chapter' && selectedItem?.index === cIndex ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            <GripVertical size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <chapterStatus.Icon size={16} className={`${chapterStatus.color} flex-shrink-0`} title={`Stato: ${chapterStatus.label}`} />
                                <span className="font-semibold truncate flex-1">{`${cIndex + 1}. ${chapter.title}`}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onAddParagraphToChapter(cIndex); }} className="ml-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 flex-shrink-0" title="Aggiungi paragrafo"><Plus size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onRemoveChapter(cIndex); }} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0" title="Elimina capitolo"><Trash2 size={16} /></button>
                        </div>
                        <div className="ml-6 pl-2 border-l border-gray-300 dark:border-gray-600">
                            {chapter.paragraphs.map((p, pIndex) => {
                                const pStatusKey = p.status || 'da_iniziare';
                                const pStatus = STATUSES[pStatusKey];
                                return (
                                    <div key={p.id} draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e, { type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex }); }} onDragOver={(e) => { e.stopPropagation(); onDragOver(e); }} onDrop={(e) => { e.stopPropagation(); onDrop(e, { type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex }); }} onDragEnd={onDragEnd} className="flex items-center group">
                                        <div onClick={() => onSelect({ type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex })} className={`flex-1 p-1.5 rounded-md cursor-pointer text-sm flex items-center min-w-0 ${selectedItem?.type === 'paragraph' && selectedItem?.chapterIndex === cIndex && selectedItem?.paragraphIndex === pIndex ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                            <pStatus.Icon size={14} className={`mr-2 flex-shrink-0 ${pStatus.color}`} title={`Stato: ${pStatus.label}`} />
                                            <span className="text-gray-500 mr-2 flex-shrink-0">{`${cIndex + 1}.${pIndex + 1}`}</span>
                                            <span className="truncate flex-1">{p.title}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); onRemoveParagraph(cIndex, pIndex); }} className="ml-2 mr-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0" title="Elimina paragrafo"><Trash2 size={14} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
    const renderCharacters = () => (
        <>
            {projectData.characters.map((char, index) => (
                <div key={char.id} onClick={() => onSelect({ type: 'character', index })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'character' && selectedItem?.index === index ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    <span className="flex-1 truncate">{char.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveCharacter(char.id); }} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Elimina personaggio"><Trash2 size={16} /></button>
                </div>
            ))}
        </>
    );
    const renderPlaces = () => (
        <>
            {projectData.places.map((place, index) => (
                <div key={place.id} onClick={() => onSelect({ type: 'place', index })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'place' && selectedItem?.index === index ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    <span className="flex-1 truncate">{place.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemovePlace(place.id); }} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Elimina luogo"><Trash2 size={16} /></button>
                </div>
            ))}
        </>
    );
    const renderSummaries = () => {
        const characterAppearances = {};
        projectData.characters.forEach(char => {
            characterAppearances[char.name] = [];
            projectData.chapters.forEach((chap, cIndex) => {
                chap.paragraphs.forEach((p, pIndex) => {
                    if (p.linkedCharacterIds?.includes(char.id)) {
                        characterAppearances[char.name].push(`${cIndex + 1}.${pIndex + 1}`);
                    }
                });
            });
        });
        const placeAppearances = {};
        projectData.places.forEach(place => {
            placeAppearances[place.name] = [];
            projectData.chapters.forEach((chap, cIndex) => {
                chap.paragraphs.forEach((p, pIndex) => {
                    if (p.linkedPlaceIds?.includes(place.id)) {
                        placeAppearances[place.name].push(`${cIndex + 1}.${pIndex + 1}`);
                    }
                });
            });
        });
        return (
            <div className="text-sm p-2">
                <h3 className="font-bold text-lg mb-2">Riepilogo Personaggi</h3>
                {Object.entries(characterAppearances).map(([name, refs]) => (
                    <div key={name} className="mb-2">
                        <div className="font-semibold">{name}</div>
                        <div className="text-xs text-gray-500">{refs.length > 0 ? refs.join(', ') : 'Nessuna apparizione'}</div>
                    </div>
                ))}
                <h3 className="font-bold text-lg mt-6 mb-2">Riepilogo Luoghi</h3>
                {Object.entries(placeAppearances).map(([name, refs]) => (
                    <div key={name} className="mb-2">
                        <div className="font-semibold">{name}</div>
                        <div className="text-xs text-gray-500">{refs.length > 0 ? refs.join(', ') : 'Nessuna apparizione'}</div>
                    </div>
                ))}
            </div>
        );
    };
    const tabContent = {
        index: renderIndex(),
        characters: renderCharacters(),
        places: renderPlaces(),
        summaries: renderSummaries(),
    };
    const addButtonAction = {
        index: onAddChapter,
        characters: onAddCharacter,
        places: onAddPlace,
    };
    const addButtonLabel = {
        index: 'Aggiungi Capitolo',
        characters: 'Aggiungi Personaggio',
        places: 'Aggiungi Luogo',
    };
    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 min-w-[320px] max-w-[450px] bg-gray-50 dark:bg-gray-900 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0 p-1 bg-gray-200 dark:bg-gray-800 flex-wrap">
                <div className="flex items-center">
                    <button onClick={() => setActiveTab('index')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'index' ? 'bg-white dark:bg-black' : ''}`}><BookOpen size={16}/> Indice</button>
                    <button onClick={() => setActiveTab('characters')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'characters' ? 'bg-white dark:bg-black' : ''}`}><Users size={16}/> Personaggi</button>
                    <button onClick={() => setActiveTab('places')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'places' ? 'bg-white dark:bg-black' : ''}`}><MapPin size={16}/> Luoghi</button>
                </div>
                <div className="flex items-center mt-1">
                     <button onClick={() => setActiveTab('summaries')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'summaries' ? 'bg-white dark:bg-black' : ''}`}><BarChart2 size={16}/> Riepiloghi</button>
                     <button onClick={onShowTimeline} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded`}><Calendar size={16}/> Timeline</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {tabContent[activeTab]}
            </div>
            {addButtonAction[activeTab] && (
                <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={addButtonAction[activeTab]} className="w-full p-2 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900">
                        <Plus size={16} className="mr-2" /> {addButtonLabel[activeTab]}
                    </button>
                </div>
            )}
        </aside>
    );
};

const Editor = ({ item, onUpdate, onAddParagraph, projectData, onLinkChange, onEnterConcentrationMode }) => {
    const contentRef = useRef(null);
    const bioRef = useRef(null);
    const notesRef = useRef(null);
    const descriptionRef = useRef(null);

    useEffect(() => {
        if (!item || !item.data) return;
        switch (item.type) {
            case 'paragraph':
                if (contentRef.current && contentRef.current.innerHTML !== item.data.content) {
                    contentRef.current.innerHTML = item.data.content;
                }
                break;
            case 'character':
                if (bioRef.current && bioRef.current.innerHTML !== item.data.bio) {
                    bioRef.current.innerHTML = item.data.bio;
                }
                if (notesRef.current && notesRef.current.innerHTML !== item.data.notes) {
                    notesRef.current.innerHTML = item.data.notes;
                }
                break;
            case 'place':
                if (descriptionRef.current && descriptionRef.current.innerHTML !== item.data.description) {
                    descriptionRef.current.innerHTML = item.data.description;
                }
                break;
            default:
                break;
        }
    }, [item]);

    if (!item || !item.data) {
        return <div className="flex-1 p-8 text-center text-gray-500 flex items-center justify-center"><div><Book size={48} className="mx-auto text-gray-400 mb-4"/><p>Seleziona un elemento dalla barra laterale per iniziare a modificare.</p></div></div>;
    }

    const renderers = {
        chapter: () => (
            <div className="flex flex-col h-full p-8">
                <input key={`title-${item.data.id}`} type="text" defaultValue={item.data.title} onBlur={(e) => onUpdate('title', e.target.value)} placeholder="Titolo del Capitolo" className="text-4xl font-bold w-full bg-transparent focus:outline-none mb-8 py-4"/>
                <button onClick={onAddParagraph} className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"><Plus size={16} className="mr-1" /> Aggiungi Paragrafo</button>
            </div>
        ),
        paragraph: () => (
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0 px-8 pt-8">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                        <input key={`title-${item.data.id}`} type="text" defaultValue={item.data.title} onBlur={(e) => onUpdate('title', e.target.value)} placeholder="Titolo del Paragrafo" className="text-2xl font-semibold w-full bg-transparent focus:outline-none py-2"/>
                        <button onClick={() => onEnterConcentrationMode(item)} className="p-2 text-gray-500 hover:text-blue-500" title="Modalità Concentrazione">
                            <Maximize size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Inizio</label>
                            <input type="date" defaultValue={item.data.startDate || ''} onBlur={(e) => onUpdate('startDate', e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fine</label>
                            <input type="date" defaultValue={item.data.endDate || ''} onBlur={(e) => onUpdate('endDate', e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    </div>
                    <div className="space-y-4 my-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato Paragrafo</label>
                            <select 
                                value={item.data.status || 'da_iniziare'} 
                                onChange={(e) => onUpdate('status', e.target.value)} 
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            >
                                {Object.entries(STATUSES).map(([key, {label}]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                            <textarea 
                                key={`notes-${item.data.id}`} 
                                defaultValue={item.data.notes || ''} 
                                onBlur={(e) => onUpdate('notes', e.target.value)} 
                                placeholder="Scrivi qui le tue note, idee o cose da ricordare per questo paragrafo..." 
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 h-24 text-sm"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-8 py-4">
                    <div key={`content-${item.data.id}`} ref={contentRef} contentEditable suppressContentEditableWarning onBlur={(e) => onUpdate('content', e.target.innerHTML)} className="prose dark:prose-invert prose-lg max-w-none w-full focus:outline-none" style={{ fontFamily: item.data.font || 'Arial', textAlign: item.data.align || 'left' }} dangerouslySetInnerHTML={{ __html: item.data.content }}/>
                </div>
                <div className="flex-shrink-0 mt-4 p-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold mb-2">Collegamenti</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-sm">Personaggi</h4>
                            <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                                {projectData.characters.map(char => (
                                    <label key={char.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                                        <input type="checkbox" checked={item.data.linkedCharacterIds?.includes(char.id) || false} onChange={() => onLinkChange('character', char.id)} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                                        <span>{char.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-sm">Luoghi</h4>
                            <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                                {projectData.places.map(place => (
                                    <label key={place.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                                        <input type="checkbox" checked={item.data.linkedPlaceIds?.includes(place.id) || false} onChange={() => onLinkChange('place', place.id)} className="form-checkbox h-4 w-4 text-blue-600 rounded"/>
                                        <span>{place.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        character: () => (
             <div className="flex flex-col h-full p-8">
                <input key={`name-${item.data.id}`} type="text" defaultValue={item.data.name} onBlur={(e) => onUpdate('name', e.target.value)} placeholder="Nome Personaggio" className="text-3xl font-bold w-full bg-transparent focus:outline-none mb-2 py-4"/>
                <input key={`nickname-${item.data.id}`} type="text" defaultValue={item.data.nickname} onBlur={(e) => onUpdate('nickname', e.target.value)} placeholder="Soprannome" className="text-xl italic text-gray-500 w-full bg-transparent focus:outline-none mb-6 py-2"/>
                <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dati anagrafici</label>
                    <div
                        key={`bio-${item.data.id}`}
                        ref={bioRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdate('bio', e.target.innerHTML)}
                        className="prose dark:prose-invert max-w-none w-full focus:outline-none bg-gray-50 dark:bg-gray-800 p-2 rounded-md min-h-[96px] mb-4"
                        style={{ fontFamily: item.data.font, textAlign: item.data.align }}
                        dangerouslySetInnerHTML={{ __html: item.data.bio }}
                    />
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note libere</label>
                    <div
                        key={`notes-${item.data.id}`}
                        ref={notesRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdate('notes', e.target.innerHTML)}
                        className="prose dark:prose-invert max-w-none w-full focus:outline-none bg-gray-50 dark:bg-gray-800 p-2 rounded-md flex-1 min-h-[128px]"
                        style={{ fontFamily: item.data.font, textAlign: item.data.align }}
                        dangerouslySetInnerHTML={{ __html: item.data.notes }}
                    />
                </div>
            </div>
        ),
        place: () => (
             <div className="flex flex-col h-full p-8">
                <input key={`name-${item.data.id}`} type="text" defaultValue={item.data.name} onBlur={(e) => onUpdate('name', e.target.value)} placeholder="Nome Luogo" className="text-3xl font-bold w-full bg-transparent focus:outline-none mb-4 py-4"/>
                <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione del luogo</label>
                    <div
                        key={`desc-${item.data.id}`}
                        ref={descriptionRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdate('description', e.target.innerHTML)}
                        className="prose dark:prose-invert max-w-none w-full focus:outline-none bg-gray-50 dark:bg-gray-800 p-2 rounded-md flex-1 min-h-[200px]"
                        style={{ fontFamily: item.data.font, textAlign: item.data.align }}
                        dangerouslySetInnerHTML={{ __html: item.data.description }}
                    />
                </div>
            </div>
        )
    };

    return (
        <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                {renderers[item.type] ? renderers[item.type]() : null}
            </div>
        </main>
    );
};

const Toolbar = ({ onFontChange, onAlignChange, currentFont, currentAlign, isTextEditable, variant = 'default' }) => {
    const fonts = [
        'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS', 
        'Times New Roman', 'Georgia', 'Garamond', 
        'Courier New', 'Brush Script MT', 'Comic Sans MS',
        'Lato', 'Roboto', 'Open Sans', 'Montserrat', 
        'Merriweather', 'Playfair Display', 'Lora', 'Roboto Mono'
    ];
    const applyStyle = (command) => document.execCommand(command, false, null);

    const isDark = variant === 'dark';

    const containerStyle = isDark ? 'bg-black border-b border-gray-800' : 'bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700';
    const buttonStyle = isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
    const activeButtonStyle = isDark ? 'bg-gray-700 text-white' : 'bg-blue-200 dark:bg-blue-800';
    const selectStyle = isDark ? 'bg-black text-gray-300 hover:bg-gray-700' : 'bg-transparent dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700';
    const separatorStyle = isDark ? 'border-gray-700' : 'border-gray-300 dark:border-gray-600';

    return (
        <div className={`flex-shrink-0 p-2 flex items-center space-x-2 flex-wrap justify-center ${containerStyle}`}>
            <button onClick={() => applyStyle('bold')} disabled={!isTextEditable} className={`p-2 rounded disabled:opacity-50 ${buttonStyle}`}><Bold size={20} /></button>
            <button onClick={() => applyStyle('italic')} disabled={!isTextEditable} className={`p-2 rounded disabled:opacity-50 ${buttonStyle}`}><Italic size={20} /></button>
            <button onClick={() => applyStyle('underline')} disabled={!isTextEditable} className={`p-2 rounded disabled:opacity-50 ${buttonStyle}`}><Underline size={20} /></button>
            
            <div className={`h-6 border-l ${separatorStyle} mx-2`}></div>
            
            <select onChange={(e) => onFontChange(e.target.value)} value={currentFont} disabled={!isTextEditable} className={`p-2 rounded focus:outline-none disabled:opacity-50 ${selectStyle}`}>
                {fonts.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
            
            <div className={`h-6 border-l ${separatorStyle} mx-2`}></div>
            
            <button onClick={() => onAlignChange('left')} disabled={!isTextEditable} className={`p-2 rounded ${currentAlign === 'left' ? activeButtonStyle : buttonStyle} disabled:opacity-50`}><AlignLeft size={20} /></button>
            <button onClick={() => onAlignChange('center')} disabled={!isTextEditable} className={`p-2 rounded ${currentAlign === 'center' ? activeButtonStyle : buttonStyle} disabled:opacity-50`}><AlignCenter size={20} /></button>
            <button onClick={() => onAlignChange('right')} disabled={!isTextEditable} className={`p-2 rounded ${currentAlign === 'right' ? activeButtonStyle : buttonStyle} disabled:opacity-50`}><AlignRight size={20} /></button>
        </div>
    );
};

const ExportModal = ({ show, onClose, chapters, onExport }) => {
    const [exportType, setExportType] = useState('all');
    const [selectedChapter, setSelectedChapter] = useState(0);
    const [selectedParagraph, setSelectedParagraph] = useState(0);
    useEffect(() => {
        if (show) {
            setSelectedChapter(0);
            setSelectedParagraph(0);
        }
    }, [show, chapters]);
    if (!show) return null;
    const handleExport = () => {
        let selection = { type: exportType };
        if (exportType === 'chapter') {
            selection.chapterIndex = selectedChapter;
        }
        if (exportType === 'paragraph') {
            selection.chapterIndex = selectedChapter;
            selection.paragraphIndex = selectedParagraph;
        }
        onExport(selection);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Esporta in PDF</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2">Cosa vuoi esportare?</label>
                        <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">Intero Documento</option>
                            <option value="chapter">Un Capitolo</option>
                            <option value="paragraph">Un Paragrafo</option>
                        </select>
                    </div>
                    {exportType === 'chapter' && chapters.length > 0 && (
                        <div>
                            <label className="block mb-2">Seleziona Capitolo</label>
                            <select value={selectedChapter} onChange={(e) => setSelectedChapter(parseInt(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                {chapters.map((ch, i) => <option key={ch.id} value={i}>{`${i + 1}. ${ch.title}`}</option>)}
                            </select>
                        </div>
                    )}
                    {exportType === 'paragraph' && chapters.length > 0 && (
                        <>
                            <div>
                                <label className="block mb-2">Seleziona Capitolo</label>
                                <select value={selectedChapter} onChange={(e) => { setSelectedChapter(parseInt(e.target.value)); setSelectedParagraph(0); }} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                    {chapters.map((ch, i) => <option key={ch.id} value={i}>{`${i + 1}. ${ch.title}`}</option>)}
                                </select>
                            </div>
                            {chapters[selectedChapter]?.paragraphs.length > 0 ? (
                                <div>
                                    <label className="block mb-2">Seleziona Paragrafo</label>
                                    <select value={selectedParagraph} onChange={(e) => setSelectedParagraph(parseInt(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                        {chapters[selectedChapter]?.paragraphs.map((p, i) => <option key={p.id} value={i}>{`${selectedChapter + 1}.${i + 1} - ${p.title}`}</option>)}
                                    </select>
                                </div>
                            ) : (<p className="text-sm text-yellow-500 mt-2">Questo capitolo non ha paragrafi.</p>)}
                        </>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 mr-2 rounded bg-gray-200 dark:bg-gray-600">Annulla</button>
                    <button onClick={handleExport} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Esporta</button>
                </div>
            </div>
        </div>
    );
};

const ConcentrationEditor = ({ item, onUpdate, onExit, onFontChange, onAlignChange }) => {
    const contentRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [currentData, setCurrentData] = useState(item.data);

    const centerCursor = useCallback(() => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || (rect.top === 0 && rect.left === 0)) return;

        const viewportMidpoint = window.innerHeight / 2;

        if (rect.bottom > viewportMidpoint) {
            const newScrollTop = scrollContainer.scrollTop + (rect.bottom - viewportMidpoint);
            scrollContainer.scrollTo({ top: newScrollTop, behavior: 'smooth' });
        }
    }, []); 

    useEffect(() => {
        const editor = contentRef.current;
        if (editor) {
            if (editor.innerHTML !== currentData.content) {
               editor.innerHTML = currentData.content;
            }
            
            const handleSelectionChange = () => {
                if (document.activeElement === editor) {
                    centerCursor();
                }
            };

            document.addEventListener('selectionchange', handleSelectionChange);

            return () => {
                document.removeEventListener('selectionchange', handleSelectionChange);
            };
        }
    }, [centerCursor, currentData.content]);

    const handleBlur = (e) => {
        onUpdate('content', e.target.innerHTML);
    };
    
    const handleLocalFontChange = (font) => {
        setCurrentData(prev => ({ ...prev, font }));
        onFontChange(font);
    };

    const handleLocalAlignChange = (align) => {
        setCurrentData(prev => ({ ...prev, align }));
        onAlignChange(align);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-shrink-0">
                 <Toolbar 
                    variant="dark"
                    onFontChange={handleLocalFontChange} 
                    onAlignChange={handleLocalAlignChange} 
                    currentFont={currentData.font} 
                    currentAlign={currentData.align}
                    isTextEditable={true}
                 />
            </div>
            <div 
                ref={scrollContainerRef} 
                className="flex-1 overflow-y-auto flex justify-center"
            >
                 <div className="max-w-3xl w-full pt-16 pb-[50vh] px-4"> 
                    <h1 className="text-3xl font-bold mb-4 text-gray-200">{currentData.title}</h1>
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={handleBlur}
                        className="text-xl leading-relaxed prose prose-invert max-w-none w-full focus:outline-none"
                        style={{ fontFamily: currentData.font, textAlign: currentData.align }}
                    />
                </div>
            </div>
            <button onClick={onExit} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                <X size={24} />
            </button>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [books, setBooks] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeBookId, setActiveBookId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('index');
    const [concentrationModeItem, setConcentrationModeItem] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);
    const [pendingImportData, setPendingImportData] = useState(null);
    const [isTimelineMode, setIsTimelineMode] = useState(false);
    const dragItem = useRef(null);

    useEffect(() => {
        if (!auth) { 
            setIsLoading(false); 
            return; 
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !db) {
            if (!user) { setBooks({}); }
            return;
        }
        setIsLoading(true);
        const userBooksCollection = collection(db, "users", user.uid, "books");
        const q = query(userBooksCollection);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const booksData = {};
            querySnapshot.forEach((doc) => { booksData[doc.id] = doc.data(); });
            setBooks(booksData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const loadScript = (src, id) => new Promise((resolve, reject) => {
            if (document.getElementById(id)) { resolve(); return; }
            const script = document.createElement('script');
            script.src = src; script.id = id; script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script ${src}`));
            document.head.appendChild(script);
        });
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf-script")
            .then(() => setScriptsLoaded(true)).catch(console.error);
    }, []);

    const updateActiveBookData = useCallback(async (updater) => {
        if (!activeBookId || !user || !books[activeBookId]) return;
        const currentBook = books[activeBookId];
        const updatedData = updater(JSON.parse(JSON.stringify(currentBook.data)));
        const updatedBook = { ...currentBook, data: updatedData, lastModified: Date.now() };
        setBooks(currentBooks => ({ ...currentBooks, [activeBookId]: updatedBook }));
        try {
            await setDoc(doc(db, "users", user.uid, "books", activeBookId), updatedBook);
        } catch (error) {
            console.error("Error updating book:", error);
            setBooks(currentBooks => ({ ...currentBooks, [activeBookId]: currentBook }));
        }
    }, [activeBookId, user, books]);
    
    const handleCreateBook = useCallback(async (title) => {
        if (!user) return;
        const newBook = createNewBook(title);
        setIsLoading(true);
        try {
            await setDoc(doc(db, "users", user.uid, "books", newBook.id), newBook);
            setActiveBookId(newBook.id);
        } catch (error) { 
            console.error("Error creating book:", error); 
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const handleSelectBook = useCallback((bookId) => {
        setActiveBookId(bookId);
        setSelectedItem(null);
        setActiveTab('index');
    }, []);

    const handleDeleteBook = useCallback(async () => {
        if (!bookToDelete || !user) return;
        const bookIdToDelete = bookToDelete;
        setBookToDelete(null);
        try {
            await deleteDoc(doc(db, "users", user.uid, "books", bookIdToDelete));
            if (activeBookId === bookIdToDelete) {
                setActiveBookId(null);
            }
        } catch (error) { console.error("Error deleting book:", error); }
    }, [bookToDelete, user, activeBookId]);

    const handleGoToLobby = useCallback(() => {
        setActiveBookId(null);
        setSelectedItem(null);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setActiveBookId(null);
            setBooks({});
        } catch (error) { console.error("Error signing out:", error); }
    }, [auth]);
    
    const exportAllBooks = useCallback(() => {
        if(Object.keys(books).length === 0) {
            alert("Non c'è nessun libro da esportare.");
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(books, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `libreria_completa_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }, [books]);

    const handleAllBooksImport = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            try {
                const importedBooks = JSON.parse(e.target.result);
                if (typeof importedBooks === 'object' && importedBooks !== null && !Array.isArray(importedBooks)) {
                     const firstKey = Object.keys(importedBooks)[0];
                     if (!firstKey || (importedBooks[firstKey].id && importedBooks[firstKey].title && importedBooks[firstKey].data)) {
                         setPendingImportData(importedBooks);
                     } else { throw new Error("Struttura del libro non valida nel file JSON."); }
                } else { throw new Error("Il file JSON non è un oggetto valido per la libreria."); }
            } catch (err) {
                alert("Errore: Il file JSON non è valido o è corrotto. Dettagli in console.");
                console.error(err);
            }
        };
        fileReader.readAsText(file);
        event.target.value = null;
    }, []);

    const confirmImportAllBooks = useCallback(async () => {
        if (!pendingImportData || !user) return;
        const dataToImport = pendingImportData;
        setPendingImportData(null);
        setIsLoading(true);
        try {
            const currentBooksSnapshot = await getDocs(collection(db, "users", user.uid, "books"));
            const deletePromises = currentBooksSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
            await Promise.all(deletePromises);
            const writePromises = Object.entries(dataToImport).map(([bookId, bookData]) => setDoc(doc(db, "users", user.uid, "books", bookId), bookData));
            await Promise.all(writePromises);
        } catch (error) {
            console.error("Error during library import:", error);
            alert("Si è verificato un errore durante l'importazione.");
        }
    }, [pendingImportData, user]);
    
    const addChapter = useCallback(() => updateActiveBookData(data => {
        const newChapter = { id: generateId(), title: `Nuovo Capitolo ${data.chapters.length + 1}`, paragraphs: [] };
        data.chapters.push(newChapter);
        setSelectedItem({ type: 'chapter', index: data.chapters.length - 1 });
        return data;
    }), [updateActiveBookData]);

    const removeChapter = useCallback((chapIndex) => updateActiveBookData(data => {
        data.chapters.splice(chapIndex, 1);
        setSelectedItem(null);
        return data;
    }), [updateActiveBookData]);

    const addParagraph = useCallback((chapIndex) => updateActiveBookData(data => {
        const chapter = data.chapters[chapIndex];
        if (!chapter) return data;
        const newParagraph = { id: generateId(), title: 'Nuovo Paragrafo', content: '...', font: 'Arial', align: 'left', linkedCharacterIds: [], linkedPlaceIds: [], startDate: '', endDate: '', status: 'da_iniziare', notes: '' };
        chapter.paragraphs.push(newParagraph);
        setSelectedItem({ type: 'paragraph', chapterIndex: chapIndex, paragraphIndex: chapter.paragraphs.length - 1 });
        return data;
    }), [updateActiveBookData]);

    const removeParagraph = useCallback((chapIndex, paraIndex) => updateActiveBookData(data => {
        if(data.chapters[chapIndex]) {
            data.chapters[chapIndex].paragraphs.splice(paraIndex, 1);
            setSelectedItem(null);
        }
        return data;
    }), [updateActiveBookData]);

    const addCharacter = useCallback(() => updateActiveBookData(data => {
        data.characters.push({ id: generateId(), name: 'Nuovo Personaggio', nickname: '', bio: '', notes: '', font: 'Arial', align: 'left' });
        setSelectedItem({ type: 'character', index: data.characters.length - 1 });
        setActiveTab('characters');
        return data;
    }), [updateActiveBookData]);

    const removeCharacter = useCallback((id) => updateActiveBookData(data => {
        data.characters = data.characters.filter(c => c.id !== id);
        data.chapters.forEach(chap => {
            chap.paragraphs.forEach(p => {
                if (p.linkedCharacterIds) {
                    p.linkedCharacterIds = p.linkedCharacterIds.filter(charId => charId !== id);
                }
            });
        });
        setSelectedItem(null);
        return data;
    }), [updateActiveBookData]);

    const addPlace = useCallback(() => updateActiveBookData(data => {
        data.places.push({ id: generateId(), name: 'Nuovo Luogo', description: '', font: 'Arial', align: 'left' });
        setSelectedItem({ type: 'place', index: data.places.length - 1 });
        setActiveTab('places');
        return data;
    }), [updateActiveBookData]);

    const removePlace = useCallback((id) => updateActiveBookData(data => {
        data.places = data.places.filter(p => p.id !== id);
        data.chapters.forEach(chap => {
            chap.paragraphs.forEach(p => {
                if (p.linkedPlaceIds) {
                    p.linkedPlaceIds = p.linkedPlaceIds.filter(placeId => placeId !== id);
                }
            });
        });
        setSelectedItem(null);
        return data;
    }), [updateActiveBookData]);

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

    const handleLinkChange = useCallback((linkType, linkId) => {
        if (selectedItem?.type !== 'paragraph') return;
        updateActiveBookData(data => {
            const { chapterIndex, paragraphIndex } = selectedItem;
            const paragraph = data.chapters[chapterIndex]?.paragraphs[paragraphIndex];
            if (!paragraph) return data;
            const linkArrayName = linkType === 'character' ? 'linkedCharacterIds' : 'linkedPlaceIds';
            if (!paragraph[linkArrayName]) paragraph[linkArrayName] = [];
            const existingIndex = paragraph[linkArrayName].indexOf(linkId);
            if (existingIndex > -1) {
                paragraph[linkArrayName].splice(existingIndex, 1);
            } else {
                paragraph[linkArrayName].push(linkId);
            }
            return data;
        });
    }, [selectedItem, updateActiveBookData]);

    const handleFontChange = useCallback((font) => {
        if (!selectedItem) return;
        if (selectedItem.type === 'paragraph') {
            document.execCommand("fontName", false, font);
        }
        handleUpdateSelectedItem('font', font);
    }, [selectedItem, handleUpdateSelectedItem]);

    const handleAlignChange = useCallback((align) => {
        if (!selectedItem) return;
        handleUpdateSelectedItem('align', align);
    }, [selectedItem, handleUpdateSelectedItem]);
    
    const handleUpdateConcentrationItem = useCallback((field, value) => {
        if (!concentrationModeItem) return;
        setConcentrationModeItem(prev => ({...prev, data: {...prev.data, [field]: value}}));
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

    const handleDragDrop = useCallback((e, dropParams) => {
        const dragParams = dragItem.current;
        if (!dragParams) return;
        updateActiveBookData(data => {
            if (dragParams.type === 'chapter' && dropParams.type === 'chapter') {
                const [draggedChapter] = data.chapters.splice(dragParams.chapterIndex, 1);
                data.chapters.splice(dropParams.chapterIndex, 0, draggedChapter);
            } else if (dragParams.type === 'paragraph') {
                const [draggedParagraph] = data.chapters[dragParams.chapterIndex].paragraphs.splice(dragParams.paragraphIndex, 1);
                if (dropParams.type === 'chapter') {
                    data.chapters[dropParams.chapterIndex].paragraphs.push(draggedParagraph);
                } else if (dropParams.type === 'paragraph') {
                    data.chapters[dropParams.chapterIndex].paragraphs.splice(dropParams.paragraphIndex, 0, draggedParagraph);
                }
            }
            return data;
        });
        dragItem.current = null;
    }, [updateActiveBookData]);

    const exportToPdf = useCallback(async (selection) => {
        if (!activeBookId || !scriptsLoaded) return;
        setShowExportModal(false);
        setIsExporting(true);
        const projectData = books[activeBookId].data;
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            pdf.addFont('times', 'normal', 'WinAnsiEncoding');
            const PAGE_WIDTH = pdf.internal.pageSize.getWidth();
            const PAGE_HEIGHT = pdf.internal.pageSize.getHeight();
            const MARGIN = 72;
            const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
            let y = MARGIN;
            let pageNumber = 1;
            const addPageNumber = (p) => { pdf.setFont('helvetica', 'normal').setFontSize(9).text(String(p), PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN / 2, { align: 'center' }); };
            const addNewPage = () => { addPageNumber(pageNumber); pdf.addPage(); pageNumber++; y = MARGIN; };
            const checkPageBreak = (heightNeeded) => { if (y + heightNeeded > PAGE_HEIGHT - MARGIN) addNewPage(); };
            const cleanText = (html) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
                return tempDiv.textContent || "";
            };
            let chaptersToExport = [];
            let documentTitle = books[activeBookId].title;
            if (selection.type === 'chapter') { chaptersToExport = [projectData.chapters[selection.chapterIndex]];
            } else if (selection.type === 'paragraph') {
                const chap = JSON.parse(JSON.stringify(projectData.chapters[selection.chapterIndex]));
                chap.paragraphs = [chap.paragraphs[selection.paragraphIndex]];
                chaptersToExport = [chap];
            } else { chaptersToExport = projectData.chapters; }
            pdf.setFont('times', 'bold').setFontSize(28).text(documentTitle, PAGE_WIDTH / 2, PAGE_HEIGHT / 3, { align: 'center' });
            pdf.setFont('times', 'normal').setFontSize(15).text("by Autore", PAGE_WIDTH / 2, PAGE_HEIGHT / 3 + 40, { align: 'center' });
            if (chaptersToExport.length > 0) addNewPage();
            for (const [index, chapter] of chaptersToExport.entries()) {
                if (index > 0) addNewPage();
                checkPageBreak(20 * 4);
                pdf.setFont('times', 'bold').setFontSize(20).text(`Capitolo ${projectData.chapters.findIndex(c => c.id === chapter.id) + 1}`, PAGE_WIDTH / 2, y, { align: 'center' });
                y += 20 * 1.5;
                pdf.setFont('times', 'italic').setFontSize(15).text(chapter.title, PAGE_WIDTH / 2, y, { align: 'center' });
                y += 20 * 2.5;
                for (const p of chapter.paragraphs) {
                    if (p.title) {
                        checkPageBreak(15 * 2);
                        pdf.setFont('times', 'bold').setFontSize(15).text(p.title, MARGIN, y);
                        y += 15 * 2;
                    }
                    pdf.setFont('times', 'normal').setFontSize(12);
                    const textContent = cleanText(p.content);
                    if (textContent.trim() === '') continue;
                    const lines = pdf.splitTextToSize(textContent, MAX_WIDTH);
                    const blockHeight = lines.length * 12 * 1.4;
                    checkPageBreak(blockHeight);
                    pdf.text(lines, MARGIN, y, { align: 'justify', lineHeightFactor: 1.4, maxWidth: MAX_WIDTH });
                    y += blockHeight + 12;
                }
            }
            addPageNumber(pageNumber);
            pdf.save(`${documentTitle.replace(/\s/g, "_")}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Errore durante la generazione del PDF.");
        } finally {
            setIsExporting(false);
        }
    }, [books, activeBookId, scriptsLoaded]);

    const handleSelectParagraphFromTimeline = useCallback((chapterIndex, paragraphIndex) => {
        setIsTimelineMode(false); 
        setSelectedItem({ type: 'paragraph', chapterIndex, paragraphIndex }); 
        setActiveTab('index'); 
    }, []);


    if (!db || !auth) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800 p-4">
                <div className="max-w-2xl text-center">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
                    <h1 className="text-4xl font-bold mb-4">Errore di Configurazione Firebase</h1>
                    <p className="text-lg mb-6">Le chiavi di configurazione Firebase non sono state impostate correttamente nel codice. L'applicazione non può funzionare.</p>
                </div>
            </div>
        );
    }
    
    if (isLoading && !user) {
        return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={64} /></div>;
    }

    if (!user) {
        return <AuthScreen auth={auth} />;
    }

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
    if (!activeBookData) {
        return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={64} /></div>;
    }

    const editorItem = selectedItem ? {
        type: selectedItem.type,
        chapterIndex: selectedItem.chapterIndex,
        paragraphIndex: selectedItem.paragraphIndex,
        data: selectedItem.type === 'chapter' ? activeBookData.chapters[selectedItem.index]
            : selectedItem.type === 'paragraph' ? activeBookData.chapters[selectedItem.chapterIndex]?.paragraphs[selectedItem.paragraphIndex]
            : selectedItem.type === 'character' ? activeBookData.characters[selectedItem.index]
            : activeBookData.places[selectedItem.index]
    } : null;

    const currentItemStyle = (selectedItem && editorItem?.data) ? { font: editorItem.data.font || 'Arial', align: editorItem.data.align || 'left' } : { font: 'Arial', align: 'left' };

    const activeBookStatusKey = calculateBookStatus(activeBookData);
    const activeBookStatus = STATUSES[activeBookStatusKey];

    if (isTimelineMode) {
        return (
            <TimelineView 
                chapters={activeBookData.chapters}
                onSelectParagraph={handleSelectParagraphFromTimeline}
                onExit={() => setIsTimelineMode(false)}
            />
        );
    }

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
            <Sidebar 
                projectData={activeBookData} 
                onSelect={setSelectedItem} 
                selectedItem={selectedItem} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onAddChapter={addChapter} 
                onAddParagraphToChapter={addParagraph} 
                onAddCharacter={addCharacter} 
                onAddPlace={addPlace} 
                onDragStart={(e, params) => dragItem.current = params} 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={(e, params) => handleDragDrop(e, params)} 
                onDragEnd={() => dragItem.current = null} 
                onRemoveChapter={removeChapter} 
                onRemoveParagraph={removeParagraph} 
                onRemoveCharacter={removeCharacter} 
                onRemovePlace={removePlace}
                onShowTimeline={() => setIsTimelineMode(true)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={handleGoToLobby} title="Torna alla scelta dei libri" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Home size={20} /> <span className="hidden md:inline">Lobby</span>
                    </button>
                    <div className="text-center font-bold truncate px-4 flex items-center gap-2 min-w-0">
                        <Book size={16} className="inline-block mr-2 flex-shrink-0" />
                        <span className="truncate">{books[activeBookId].title}</span>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${activeBookStatus.color}`}>
                            <activeBookStatus.Icon size={12} />
                            <span>{activeBookStatus.label}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                         <button onClick={() => setShowExportModal(true)} disabled={!scriptsLoaded || isExporting} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <FileDown size={20} /> <span className="hidden md:inline">{isExporting ? 'Esportazione...' : (scriptsLoaded ? 'Esporta PDF' : 'Caricamento...')}</span>
                        </button>
                    </div>
                </header>
                
                <Toolbar 
                    onFontChange={handleFontChange} 
                    onAlignChange={handleAlignChange} 
                    currentFont={currentItemStyle.font} 
                    currentAlign={currentItemStyle.align} 
                    isTextEditable={['paragraph', 'character', 'place'].includes(selectedItem?.type)}
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
