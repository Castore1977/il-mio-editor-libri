import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Monitor, Smartphone, FileDown, X, GripVertical, BookOpen, Users, MapPin, BarChart2, Upload, Download, Calendar, Home, Book, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// Le tue chiavi sono state mantenute come richiesto.
const firebaseConfig = {
    apiKey: "AIzaSyBHVUJq6uTXyPph8dAyoXDCC_i8CMeGVZU",
    authDomain: "il-mio-editor-libri.firebaseapp.com",
    projectId: "il-mio-editor-libri",
    storageBucket: "il-mio-editor-libri.firebasestorage.app",
    messagingSenderId: "504094176371",
    appId: "1:504094176371:web:9e041cba468c3b8d3f6606",
    measurementId: "G-DLC0JG4NSL"
};

// --- ERROR COMPONENT FOR FIREBASE CONFIG ---
const FirebaseConfigError = () => {
    // Questo componente viene mostrato se la chiave API è un segnaposto.
    // Nel tuo caso attuale non verrà mai mostrato perché hai inserito le chiavi reali.
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800 p-4">
            <div className="max-w-2xl text-center">
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
                <h1 className="text-4xl font-bold mb-4">Errore di Configurazione Firebase</h1>
                <p className="text-lg mb-6">
                    L'applicazione non può connettersi a Firebase perché le chiavi di configurazione non sono state impostate.
                </p>
                <div className="bg-red-100 border border-red-300 rounded-lg p-6 text-left">
                    <h2 className="text-2xl font-semibold mb-3">Azione Richiesta</h2>
                    <p className="mb-4">
                        Per risolvere questo problema, devi modificare il codice sorgente.
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Trova l'oggetto `firebaseConfig` all'inizio del file del codice.</li>
                        <li>Sostituisci i valori segnaposto (come `"YOUR_API_KEY"`) con le tue vere credenziali prese dalla console del tuo progetto Firebase.</li>
                    </ol>
                    <pre className="bg-gray-800 text-white p-4 rounded-md mt-4 overflow-x-auto text-sm">
                        <code>
{`const firebaseConfig = {
    apiKey: "LA_TUA_API_KEY_QUI",
    authDomain: "IL_TUO_DOMINIO_AUTH_QUI",
    projectId: "IL_TUO_PROJECT_ID_QUI",
    // ... e così via per gli altri campi
};`}
                        </code>
                    </pre>
                </div>
                <p className="mt-6 text-md">
                    Una volta aggiornate le chiavi, l'applicazione dovrebbe funzionare correttamente.
                </p>
            </div>
        </div>
    );
};


// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;


// --- HELPERS ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- INITIAL DATA STRUCTURE FOR A NEW BOOK ---
const createNewBook = (title) => {
    const bookId = generateId();
    return {
        id: bookId,
        title: title || "Nuovo Libro",
        lastModified: Date.now(),
        data: {
            chapters: [{ id: generateId(), title: 'Introduzione', paragraphs: [{ id: generateId(), title: 'Primo Paragrafo', content: 'Inizia a scrivere qui...', font: 'Arial', align: 'left', linkedCharacterIds: [], linkedPlaceIds: [], startDate: '', endDate: '' }] }],
            characters: [{ id: generateId(), name: 'Protagonista', nickname: 'Eroe', bio: 'Nato il...', notes: 'Nessuna nota' }],
            places: [{ id: generateId(), name: 'Città Iniziale', description: 'Una ridente cittadina.' }]
        }
    };
};

// --- DATE HELPERS ---
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

// --- COMPONENTS ---

const AuthScreen = () => {
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
            // onAuthStateChanged will handle the rest
        } catch (err) {
            switch(err.code) {
                case 'auth/invalid-email':
                    setError('Formato email non valido.');
                    break;
                case 'auth/user-not-found':
                case 'auth/invalid-credential': // Nuovo codice errore per utente non trovato o psw errata
                    setError('Credenziali non valide. Controlla email e password.');
                    break;
                case 'auth/wrong-password':
                    setError('Password errata.');
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
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="text-red-500 mr-3" size={24} />
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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
             <div className="absolute top-4 right-4">
                 <button onClick={onLogout} className="p-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2">
                     <LogOut size={16} /> Logout
                 </button>
             </div>
            <div className="w-full max-w-3xl mx-auto mt-16">
                <h1 className="text-4xl font-bold text-center mb-8">I Tuoi Libri</h1>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Crea o Gestisci</h2>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={newBookTitle}
                            onChange={(e) => setNewBookTitle(e.target.value)}
                            placeholder="Titolo del nuovo libro..."
                            className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button onClick={handleCreate} className="p-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                            <Plus size={16} /> Crea
                        </button>
                    </div>
                     <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-center">
                        <input type="file" ref={importFileRef} onChange={onImportAll} className="hidden" accept=".json"/>
                        <button onClick={handleImportClick} className="p-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2">
                            <Upload size={16} /> Importa Libreria
                        </button>
                        <button onClick={onExportAll} className="p-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                            <Download size={16} /> Esporta Tutta la Libreria
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-4">Apri un Progetto Esistente</h2>
                    {Object.values(books).length > 0 ? (
                        Object.values(books).sort((a, b) => b.lastModified - a.lastModified).map(book => (
                            <div key={book.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md group">
                                <div>
                                    <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{book.title}</h3>
                                    <p className="text-sm text-gray-500">Ultima modifica: {new Date(book.lastModified).toLocaleString('it-IT')}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                     <button onClick={() => onSelectBook(book.id)} className="p-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apri</button>
                                     <button onClick={() => onDeleteBook(book.id)} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 opacity-50 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">Non hai ancora nessun libro. Creane uno per iniziare!</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const TimelineView = ({ chapters }) => {
    const allParagraphs = chapters.flatMap(c => c.paragraphs);
    const validParagraphs = allParagraphs.filter(p => p.startDate && p.endDate && parseDate(p.startDate) && parseDate(p.endDate));

    if (validParagraphs.length === 0) {
        return <div className="p-4 text-center text-gray-500">Nessun paragrafo con date valide da mostrare nella timeline.</div>;
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
        <div className="p-4 space-y-6">
            <div className="relative h-10 border-b-2 border-gray-300 dark:border-gray-600">
                {monthHeaders.map((month, index) => (
                    <div key={index} className="absolute top-0 h-full flex items-center justify-center border-r border-gray-200 dark:border-gray-700" style={{ left: `${month.offset}%`, width: `${month.width}%` }}>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate px-1">{month.label}</span>
                    </div>
                ))}
            </div>
            <div className="space-y-4">
                {chapters.map(chapter => {
                    const chapterParagraphs = chapter.paragraphs.filter(p => p.startDate && p.endDate && parseDate(p.startDate) && parseDate(p.endDate));
                    if (chapterParagraphs.length === 0) return null;
                    const chapterDates = chapterParagraphs.flatMap(p => [parseDate(p.startDate), parseDate(p.endDate)]);
                    const chapterStartDate = new Date(Math.min(...chapterDates));
                    const chapterEndDate = new Date(Math.max(...chapterDates));
                    return (
                        <div key={chapter.id}>
                            <h3 className="font-bold mb-2">{chapter.title}</h3>
                            <p className="text-xs text-gray-500 mb-2">{`Dal ${formatDate(chapterStartDate)} al ${formatDate(chapterEndDate)}`}</p>
                            <div className="space-y-1">
                                {chapterParagraphs.map(p => {
                                    const pStart = parseDate(p.startDate);
                                    const pEnd = parseDate(p.endDate);
                                    if (!pStart || !pEnd) return null;
                                    const offset = (daysBetween(projectStartDate, pStart) / totalDuration) * 100;
                                    const duration = Math.max(1, daysBetween(pStart, pEnd) + 1);
                                    const width = (duration / totalDuration) * 100;
                                    return (
                                        <div key={p.id} className="w-full h-8 group relative">
                                            <div className="absolute h-full bg-blue-500 hover:bg-blue-700 rounded-md transition-all" style={{ left: `${offset}%`, width: `${width}%` }}>
                                                <span className="text-black text-xs font-medium truncate px-2 leading-8">{p.title}</span>
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
    );
};


const Sidebar = ({ projectData, onSelect, selectedItem, onAddChapter, onAddCharacter, onAddPlace, onDragStart, onDragOver, onDrop, onDragEnd, onRemoveChapter, onRemoveParagraph, onAddParagraphToChapter, onRemoveCharacter, onRemovePlace, activeTab, setActiveTab }) => {
    
    const renderIndex = () => (
        <>
            {projectData.chapters.map((chapter, cIndex) => (
                <div key={chapter.id} className="mb-2" draggable onDragStart={(e) => onDragStart(e, { type: 'chapter', chapterIndex: cIndex })} onDragOver={onDragOver} onDrop={(e) => onDrop(e, { type: 'chapter', chapterIndex: cIndex })} onDragEnd={onDragEnd}>
                    <div onClick={() => onSelect({ type: 'chapter', index: cIndex })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'chapter' && selectedItem?.index === cIndex ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                        <GripVertical size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                        <span className="font-semibold flex-1 truncate">{`${cIndex + 1}. ${chapter.title}`}</span>
                        <button onClick={(e) => { e.stopPropagation(); onAddParagraphToChapter(cIndex); }} className="ml-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100" title="Aggiungi paragrafo"><Plus size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onRemoveChapter(cIndex); }} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Elimina capitolo"><Trash2 size={16} /></button>
                    </div>
                    <div className="ml-6 border-l border-gray-300 dark:border-gray-600">
                        {chapter.paragraphs.map((p, pIndex) => (
                            <div key={p.id} draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e, { type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex }); }} onDragOver={(e) => { e.stopPropagation(); onDragOver(e); }} onDrop={(e) => { e.stopPropagation(); onDrop(e, { type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex }); }} onDragEnd={onDragEnd} className="flex items-center group">
                                <div onClick={() => onSelect({ type: 'paragraph', chapterIndex: cIndex, paragraphIndex: pIndex })} className={`flex-1 p-2 rounded-md cursor-pointer text-sm truncate ${selectedItem?.type === 'paragraph' && selectedItem?.chapterIndex === cIndex && selectedItem?.paragraphIndex === pIndex ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                                    <span className="text-gray-500 mr-2">{`${cIndex + 1}.${pIndex + 1}`}</span>
                                    <span>{p.title}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onRemoveParagraph(cIndex, pIndex); }} className="ml-2 mr-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Elimina paragrafo"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );

    const renderCharacters = () => (
        <>
            {projectData.characters.map((char, index) => (
                <div key={char.id} onClick={() => onSelect({ type: 'character', index })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'character' && selectedItem?.index === index ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                    <span className="flex-1 truncate">{char.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveCharacter(char.id); }} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Elimina personaggio"><Trash2 size={16} /></button>
                </div>
            ))}
        </>
    );

    const renderPlaces = () => (
        <>
            {projectData.places.map((place, index) => (
                <div key={place.id} onClick={() => onSelect({ type: 'place', index })} className={`flex items-center p-2 rounded-md cursor-pointer group ${selectedItem?.type === 'place' && selectedItem?.index === index ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
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
        timeline: <TimelineView chapters={projectData.chapters} />
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
        <div className="w-1/3 min-w-[350px] max-w-[500px] bg-gray-100 dark:bg-gray-900 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="flex p-1 bg-gray-200 dark:bg-gray-800 flex-wrap">
                <button onClick={() => setActiveTab('index')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'index' ? 'bg-white dark:bg-black' : ''}`}><BookOpen size={16}/> Indice</button>
                <button onClick={() => setActiveTab('characters')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'characters' ? 'bg-white dark:bg-black' : ''}`}><Users size={16}/> Personaggi</button>
                <button onClick={() => setActiveTab('places')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'places' ? 'bg-white dark:bg-black' : ''}`}><MapPin size={16}/> Luoghi</button>
                <button onClick={() => setActiveTab('summaries')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'summaries' ? 'bg-white dark:bg-black' : ''}`}><BarChart2 size={16}/> Riepiloghi</button>
                <button onClick={() => setActiveTab('timeline')} className={`flex-1 p-2 text-sm flex items-center justify-center gap-2 rounded ${activeTab === 'timeline' ? 'bg-white dark:bg-black' : ''}`}><Calendar size={16}/> Timeline</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {tabContent[activeTab]}
            </div>
            {addButtonAction[activeTab] && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={addButtonAction[activeTab]} className="w-full p-2 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900">
                        <Plus size={16} className="mr-2" /> {addButtonLabel[activeTab]}
                    </button>
                </div>
            )}
        </div>
    );
};

const Editor = ({ item, onUpdate, onAddParagraph, projectData, onLinkChange }) => {
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
                <input key={`title-${item.data.id}`} type="text" defaultValue={item.data.title} onBlur={(e) => onUpdate('title', e.target.value)} placeholder="Titolo del Paragrafo" className="text-2xl font-semibold w-full bg-transparent focus:outline-none mb-4 border-b border-gray-300 dark:border-gray-700 pb-2"/>
                
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
            </>
        ),
        character: () => (
            <>
                <input key={`name-${item.data.id}`} type="text" defaultValue={item.data.name} onBlur={(e) => onUpdate('name', e.target.value)} placeholder="Nome Personaggio" className="text-3xl font-bold w-full bg-transparent focus:outline-none mb-2"/>
                <input key={`nickname-${item.data.id}`} type="text" defaultValue={item.data.nickname} onBlur={(e) => onUpdate('nickname', e.target.value)} placeholder="Soprannome" className="text-xl italic text-gray-500 w-full bg-transparent focus:outline-none mb-6"/>
                <textarea key={`bio-${item.data.id}`} defaultValue={item.data.bio} onBlur={(e) => onUpdate('bio', e.target.value)} placeholder="Dati anagrafici" className="w-full bg-gray-50 dark:bg-gray-800 p-2 rounded-md mb-4 h-24"/>
                <textarea key={`notes-${item.data.id}`} defaultValue={item.data.notes} onBlur={(e) => onUpdate('notes', e.target.value)} placeholder="Note libere" className="w-full bg-gray-50 dark:bg-gray-800 p-2 rounded-md h-48"/>
            </>
        ),
        place: () => (
            <>
                <input key={`name-${item.data.id}`} type="text" defaultValue={item.data.name} onBlur={(e) => onUpdate('name', e.target.value)} placeholder="Nome Luogo" className="text-3xl font-bold w-full bg-transparent focus:outline-none mb-4"/>
                <textarea key={`desc-${item.data.id}`} defaultValue={item.data.description} onBlur={(e) => onUpdate('description', e.target.value)} placeholder="Descrizione del luogo" className="w-full bg-gray-50 dark:bg-gray-800 p-2 rounded-md h-64"/>
            </>
        )
    };

    return (
        <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
                {renderers[item.type] ? renderers[item.type]() : null}
            </div>
        </div>
    );
};

const Toolbar = ({ onFontChange, onAlignChange, currentFont, currentAlign, selectedItem }) => {
    const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Comic Sans MS'];
    const applyStyle = (command) => document.execCommand(command, false, null);
    const isParagraphSelected = selectedItem?.type === 'paragraph';

    return (
        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2 flex-wrap">
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

const ExportModal = ({ show, onClose, chapters, onExport }) => {
    const [exportType, setExportType] = useState('all');
    const [selectedChapter, setSelectedChapter] = useState(0);
    const [selectedParagraph, setSelectedParagraph] = useState(0);

    useEffect(() => {
        // Reset selections when modal is shown or chapters change
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
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
                            ) : (
                                <p className="text-sm text-yellow-500 mt-2">Questo capitolo non ha paragrafi.</p>
                            )}
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


export default function App() {
    // --- STATE AND REFS HOOKS (must be at the top level) ---
    const [user, setUser] = useState(null);
    const [books, setBooks] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeBookId, setActiveBookId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('index');
    const [isConcentrationMode, setIsConcentrationMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);
    const [pendingImportData, setPendingImportData] = useState(null);
    
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // --- EFFECT HOOKS (must be at the top level) ---
    
    // --- AUTHENTICATION ---
    useEffect(() => {
        if (!auth) {
            setIsLoading(false);
            return;
        };
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- DATA SYNC WITH FIRESTORE ---
    useEffect(() => {
        if (!user || !db) {
            if (!user) { // If user logs out, clear books and stop loading
                setBooks({});
            }
            return;
        };

        setIsLoading(true);
        const userBooksCollection = collection(db, "users", user.uid, "books");
        const q = query(userBooksCollection);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const booksData = {};
            querySnapshot.forEach((doc) => {
                booksData[doc.id] = doc.data();
            });
            setBooks(booksData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();

    }, [user]);

    // --- SCRIPT LOADER ---
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
    

    // --- CONDITIONAL RENDERING (can only start AFTER all hooks are called) ---
    
    // This check is now mostly for demonstration as you've hardcoded the keys.
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        return <FirebaseConfigError />;
    }
    
    // --- HANDLER FUNCTIONS ---

    const updateActiveBookData = useCallback(async (updater) => {
        if (!activeBookId || !user) return;
        
        const currentBook = books[activeBookId];
        // Ensure we have a valid book to update
        if (!currentBook) {
            console.error("Attempted to update a book that doesn't exist in the state.");
            return;
        }

        const updatedData = updater(JSON.parse(JSON.stringify(currentBook.data)));
        const updatedBook = {
            ...currentBook,
            data: updatedData,
            lastModified: Date.now()
        };

        // Optimistic UI update
        setBooks(currentBooks => ({...currentBooks, [activeBookId]: updatedBook}));

        // Persist to Firestore
        try {
            const bookRef = doc(db, "users", user.uid, "books", activeBookId);
            await setDoc(bookRef, updatedBook, { merge: true }); // Using merge to be safer
        } catch (error) {
            console.error("Error updating book in Firestore:", error);
            // Revert optimistic update on error
            setBooks(currentBooks => ({...currentBooks, [activeBookId]: currentBook}));
            alert("Errore nel salvataggio delle modifiche. I dati sono stati ripristinati.");
        }
    }, [activeBookId, user, books]);

    // --- Book Management Handlers ---
    const handleCreateBook = async (title) => {
        if (!user) return;
        const newBook = createNewBook(title);
        
        setIsLoading(true);
        try {
            await setDoc(doc(db, "users", user.uid, "books", newBook.id), newBook);
            setActiveBookId(newBook.id); // onSnapshot will update the books state
        } catch (error) {
            console.error("Error creating book:", error);
        } finally {
            // Let onSnapshot handle setting isLoading to false
        }
    };

    const handleSelectBook = (bookId) => {
        setActiveBookId(bookId);
        setSelectedItem(null);
        setActiveTab('index');
    };
    
    const handleDeleteBook = async () => {
        if (!bookToDelete || !user) return;
        
        const bookIdToDelete = bookToDelete;
        setBookToDelete(null); // Close modal immediately

        try {
            await deleteDoc(doc(db, "users", user.uid, "books", bookIdToDelete));
            // The onSnapshot listener will automatically update the UI
            if (activeBookId === bookIdToDelete) {
                setActiveBookId(null); // If deleting active book, go to lobby
            }
        } catch (error) {
            console.error("Error deleting book:", error);
        }
    };
    
    const handleGoToLobby = () => {
        setActiveBookId(null);
        setSelectedItem(null);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setActiveBookId(null);
            setBooks({});
            // onAuthStateChanged will handle the user state
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // --- Global Import/Export ---
    const exportAllBooks = () => {
        if(Object.keys(books).length === 0) {
            alert("Non c'è nessun libro da esportare.");
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(books, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `libreria_completa_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleAllBooksImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            try {
                const importedBooks = JSON.parse(e.target.result);
                // Basic validation of the imported structure
                if (typeof importedBooks === 'object' && importedBooks !== null && !Array.isArray(importedBooks)) {
                     const firstKey = Object.keys(importedBooks)[0];
                     if (!firstKey || (importedBooks[firstKey].id && importedBooks[firstKey].title && importedBooks[firstKey].data)) {
                        setPendingImportData(importedBooks);
                     } else {
                        throw new Error("Struttura del libro non valida nel file JSON.");
                     }
                } else {
                    throw new Error("Il file JSON non è un oggetto valido per la libreria.");
                }
            } catch (err) {
                alert("Errore: Il file JSON non è valido o è corrotto. Dettagli in console.");
                console.error(err);
            }
        };
        fileReader.readAsText(file);
        event.target.value = null; // Reset file input
    };
    
    const confirmImportAllBooks = async () => {
        if (!pendingImportData || !user) return;
        
        const dataToImport = pendingImportData;
        setPendingImportData(null); // Close modal
        setIsLoading(true);

        try {
            // Destructive operation: delete all existing books first.
            const currentBooksSnapshot = await getDocs(collection(db, "users", user.uid, "books"));
            const deletePromises = currentBooksSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
            await Promise.all(deletePromises);

            // Now, write the new books
            const writePromises = Object.entries(dataToImport).map(([bookId, bookData]) => 
                setDoc(doc(db, "users", user.uid, "books", bookId), bookData)
            );
            await Promise.all(writePromises);
            // The onSnapshot listener will update the UI with the new data.
        } catch (error) {
            console.error("Error during library import:", error);
            alert("Si è verificato un errore durante l'importazione. La libreria potrebbe essere in uno stato inconsistente.");
        } finally {
            // Let onSnapshot handle setting isLoading to false
        }
    };


    // --- Content Management Handlers ---
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
        const newParagraph = { id: generateId(), title: 'Nuovo Paragrafo', content: '...', font: 'Arial', align: 'left', linkedCharacterIds: [], linkedPlaceIds: [], startDate: '', endDate: '' };
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
        data.characters.push({ id: generateId(), name: 'Nuovo Personaggio', nickname: '', bio: '', notes: '' });
        setSelectedItem({ type: 'character', index: data.characters.length - 1 });
        setActiveTab('characters');
        return data;
    }), [updateActiveBookData]);

    const removeCharacter = useCallback((id) => updateActiveBookData(data => {
        data.characters = data.characters.filter(c => c.id !== id);
        // Also remove links from paragraphs
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
        data.places.push({ id: generateId(), name: 'Nuovo Luogo', description: '' });
        setSelectedItem({ type: 'place', index: data.places.length - 1 });
        setActiveTab('places');
        return data;
    }), [updateActiveBookData]);

    const removePlace = useCallback((id) => updateActiveBookData(data => {
        data.places = data.places.filter(p => p.id !== id);
         // Also remove links from paragraphs
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

    const handleStyleChange = useCallback((prop, value) => {
        if (selectedItem?.type !== 'paragraph') return;
        handleUpdateSelectedItem(prop, value);
    }, [selectedItem, handleUpdateSelectedItem]);

    const handleFontChange = (font) => { 
        document.execCommand("fontName", false, font); 
        handleStyleChange('font', font); 
    };
    const handleAlignChange = (align) => { 
        handleStyleChange('align', align); 
    };

    const handleDragDrop = useCallback((e, dropParams) => {
        const dragParams = dragItem.current;
        if (!dragParams) return;

        updateActiveBookData(data => {
            // Dragging a chapter
            if (dragParams.type === 'chapter' && dropParams.type === 'chapter') {
                const [draggedChapter] = data.chapters.splice(dragParams.chapterIndex, 1);
                data.chapters.splice(dropParams.chapterIndex, 0, draggedChapter);
            } 
            // Dragging a paragraph
            else if (dragParams.type === 'paragraph') {
                const [draggedParagraph] = data.chapters[dragParams.chapterIndex].paragraphs.splice(dragParams.paragraphIndex, 1);
                
                if (dropParams.type === 'chapter') { // Dropping paragraph onto a chapter title
                    data.chapters[dropParams.chapterIndex].paragraphs.push(draggedParagraph);
                } else if (dropParams.type === 'paragraph') { // Dropping paragraph onto another paragraph
                    data.chapters[dropParams.chapterIndex].paragraphs.splice(dropParams.paragraphIndex, 0, draggedParagraph);
                }
            }
            return data;
        });
        dragItem.current = null;
    }, [updateActiveBookData]);

    const exportToPdf = async (selection) => {
        if (!activeBookId) return;
        setShowExportModal(false); 
        setIsExporting(true);
        const projectData = books[activeBookId].data;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            // Add a Unicode-supporting font
            // This is a simplified example. For full support, you might need to embed a .ttf file.
            pdf.addFont('times', 'normal', 'WinAnsiEncoding');

            const PAGE_WIDTH = pdf.internal.pageSize.getWidth();
            const PAGE_HEIGHT = pdf.internal.pageSize.getHeight();
            const MARGIN = 72;
            const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
            const FONT_FAMILY_SERIF = 'times';
            const FONT_FAMILY_SANS = 'helvetica';
            const FONT_SIZE_MAINTITLE = 28;
            const FONT_SIZE_CHAPTER = 20;
            const FONT_SIZE_SUBTITLE = 15;
            const FONT_SIZE_BODY = 12;
            const LINE_HEIGHT_BODY = 1.4;
            const PARAGRAPH_SPACING = 12;

            let y = MARGIN;
            let pageNumber = 1;

            const addPageNumber = (p) => {
                pdf.setFont(FONT_FAMILY_SANS, 'normal');
                pdf.setFontSize(9);
                pdf.text(String(p), PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN / 2, { align: 'center' });
            };

            const addNewPage = () => {
                addPageNumber(pageNumber);
                pdf.addPage();
                pageNumber++;
                y = MARGIN;
            };

            const checkPageBreak = (heightNeeded) => {
                if (y + heightNeeded > PAGE_HEIGHT - MARGIN) {
                    addNewPage();
                }
            };

            const cleanText = (html) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
                return tempDiv.textContent || "";
            };

            let chaptersToExport = [];
            let documentTitle = books[activeBookId].title;

            if (selection.type === 'chapter') {
                chaptersToExport = [projectData.chapters[selection.chapterIndex]];
            } else if (selection.type === 'paragraph') {
                const chap = JSON.parse(JSON.stringify(projectData.chapters[selection.chapterIndex]));
                chap.paragraphs = [chap.paragraphs[selection.paragraphIndex]];
                chaptersToExport = [chap];
            } else {
                chaptersToExport = projectData.chapters;
            }

            // --- Title Page ---
            pdf.setFont(FONT_FAMILY_SERIF, 'bold');
            pdf.setFontSize(FONT_SIZE_MAINTITLE);
            pdf.text(documentTitle, PAGE_WIDTH / 2, PAGE_HEIGHT / 3, { align: 'center' });
            pdf.setFont(FONT_FAMILY_SERIF, 'normal');
            pdf.setFontSize(FONT_SIZE_SUBTITLE);
            pdf.text("by Autore", PAGE_WIDTH / 2, PAGE_HEIGHT / 3 + 40, { align: 'center' }); // Placeholder
            
            // --- Content ---
            if(chaptersToExport.length > 0) addNewPage();

            for (const [index, chapter] of chaptersToExport.entries()) {
                if (index > 0) addNewPage();
                checkPageBreak(FONT_SIZE_CHAPTER * 4);
                
                pdf.setFont(FONT_FAMILY_SERIF, 'bold');
                pdf.setFontSize(FONT_SIZE_CHAPTER);
                const chapterGlobalIndex = projectData.chapters.findIndex(c => c.id === chapter.id) + 1;
                pdf.text(`Capitolo ${chapterGlobalIndex}`, PAGE_WIDTH / 2, y, { align: 'center' });
                y += FONT_SIZE_CHAPTER * 1.5;

                pdf.setFont(FONT_FAMILY_SERIF, 'italic');
                pdf.setFontSize(FONT_SIZE_SUBTITLE);
                pdf.text(chapter.title, PAGE_WIDTH / 2, y, { align: 'center' });
                y += FONT_SIZE_CHAPTER * 2.5;

                for (const p of chapter.paragraphs) {
                    if (p.title) {
                        const titleHeight = FONT_SIZE_SUBTITLE * 2;
                        checkPageBreak(titleHeight);
                        pdf.setFont(FONT_FAMILY_SERIF, 'bold');
                        pdf.setFontSize(FONT_SIZE_SUBTITLE);
                        pdf.text(p.title, MARGIN, y);
                        y += titleHeight;
                    }
                    pdf.setFont(FONT_FAMILY_SERIF, 'normal');
                    pdf.setFontSize(FONT_SIZE_BODY);
                    const textContent = cleanText(p.content);
                    if (textContent.trim() === '') continue;

                    const lines = pdf.splitTextToSize(textContent, MAX_WIDTH);
                    const blockHeight = lines.length * FONT_SIZE_BODY * LINE_HEIGHT_BODY;
                    
                    checkPageBreak(blockHeight);
                    pdf.text(lines, MARGIN, y, { align: 'justify', lineHeightFactor: LINE_HEIGHT_BODY, maxWidth: MAX_WIDTH });
                    y += blockHeight + PARAGRAPH_SPACING;
                }
            }
            addPageNumber(pageNumber);
            pdf.save(`${documentTitle.replace(/\s/g, "_")}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Errore durante la generazione del PDF. Controlla la console.");
        } finally {
            setIsExporting(false);
        }
    };
    
    
    // --- RENDER LOGIC ---
    if (isLoading && !user) { // Show loader only on initial auth check
        return (
             <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center">
                <Loader2 className="animate-spin text-blue-500" size={64} />
            </div>
        );
    }

    if (!user) {
        return <AuthScreen />;
    }

    if (!activeBookId) {
        return (
            <>
                <ConfirmationModal 
                    show={!!bookToDelete}
                    title="Conferma Eliminazione"
                    message={`Sei sicuro di voler eliminare permanentemente il libro "${books[bookToDelete]?.title}"? Questa azione non può essere annullata.`}
                    onConfirm={handleDeleteBook}
                    onCancel={() => setBookToDelete(null)}
                    confirmText="Elimina"
                    confirmColor="bg-red-600 hover:bg-red-700"
                />
                 <ConfirmationModal 
                    show={!!pendingImportData}
                    title="Conferma Importazione Libreria"
                    message="Stai per SOSTITUIRE la tua intera libreria con il contenuto del file. Tutti i libri attuali verranno CANCELLATI. Questa azione è irreversibile."
                    onConfirm={confirmImportAllBooks}
                    onCancel={() => setPendingImportData(null)}
                    confirmText="Sostituisci Tutto"
                    confirmColor="bg-yellow-600 hover:bg-yellow-700"
                />
                <BookLobby 
                    books={books}
                    onSelectBook={handleSelectBook}
                    onCreateBook={handleCreateBook}
                    onDeleteBook={(id) => setBookToDelete(id)}
                    onExportAll={exportAllBooks}
                    onImportAll={handleAllBooksImport}
                    isLoading={isLoading} // Loading for book data
                    onLogout={handleLogout}
                />
            </>
        );
    }
    
    const activeBookData = books[activeBookId]?.data;
    if (!activeBookData) {
        // This can happen briefly if a book is deleted.
        // The effect hook for activeBookId will handle redirecting.
        return (
             <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center">
                <Loader2 className="animate-spin text-blue-500" size={64} />
            </div>
        );
    }

    const editorItem = selectedItem ? {
        type: selectedItem.type,
        data: selectedItem.type === 'chapter' ? activeBookData.chapters[selectedItem.index]
            : selectedItem.type === 'paragraph' ? activeBookData.chapters[selectedItem.chapterIndex]?.paragraphs[selectedItem.paragraphIndex]
            : selectedItem.type === 'character' ? activeBookData.characters[selectedItem.index]
            : activeBookData.places[selectedItem.index]
    } : null;
    
    const currentParagraphStyle = (selectedItem?.type === 'paragraph' && editorItem?.data) || { font: 'Arial', align: 'left' };

    if (isConcentrationMode) {
        return (
            <div className="bg-white dark:bg-black text-black dark:text-white min-h-screen w-screen p-8 md:p-16 lg:p-24 font-serif">
                <button onClick={() => setIsConcentrationMode(false)} className="fixed top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white z-50"> <Smartphone size={24} /> </button>
                <div className="max-w-3xl mx-auto">
                    {activeBookData.chapters.map((chapter, cIndex) => (
                        <div key={chapter.id} className="mb-12">
                            <h2 className="text-4xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-2">{`${cIndex + 1}. ${chapter.title}`}</h2>
                            {chapter.paragraphs.map((p, pIndex) => (
                                <div key={p.id} className="mb-8">
                                    <h3 className="text-2xl font-semibold mb-4">{p.title && `${cIndex + 1}.${pIndex + 1} ${p.title}`}</h3>
                                    <div className="text-xl leading-relaxed prose dark:prose-invert" style={{ fontFamily: p.font, textAlign: p.align }} dangerouslySetInnerHTML={{ __html: p.content }} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
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
                onDrop={(e) => handleDragDrop(e, e.target.dataset)}
                onDragEnd={() => dragItem.current = null}
                onRemoveChapter={removeChapter}
                onRemoveParagraph={removeParagraph}
                onRemoveCharacter={removeCharacter}
                onRemovePlace={removePlace}
            />

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
                        <button onClick={() => setIsConcentrationMode(true)} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Monitor size={20} /> <span className="hidden md:inline">Concentrazione</span>
                        </button>
                    </div>
                </div>
                <Toolbar 
                    onFontChange={handleFontChange}
                    onAlignChange={handleAlignChange}
                    currentFont={currentParagraphStyle.font}
                    currentAlign={currentParagraphStyle.align}
                    selectedItem={selectedItem}
                />
                <Editor 
                    item={editorItem}
                    projectData={activeBookData}
                    onUpdate={handleUpdateSelectedItem}
                    onAddParagraph={() => addParagraph(selectedItem.index)}
                    onLinkChange={handleLinkChange}
                />
            </div>
        </div>
    );
}