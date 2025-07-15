import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Monitor, Smartphone, FileDown, X, GripVertical, BookOpen, Users, MapPin, BarChart2, Upload, Download, Calendar, Home, Book, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
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
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800 p-4">
            <div className="max-w-2xl text-center">
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
                <h1 className="text-4xl font-bold mb-4">Errore di Configurazione Firebase</h1>
                <p className="text-lg mb-6">Le chiavi di configurazione Firebase non sono state impostate correttamente.</p>
            </div>
        </div>
    );
};

// --- FIREBASE INITIALIZATION ---
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("Firebase initialization error:", error);
}
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- HELPER FUNCTIONS ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createNewBook = (title) => ({
    id: generateId(),
    title: title || "Nuovo Libro",
    lastModified: Date.now(),
    data: {
        chapters: [{ id: generateId(), title: 'Introduzione', paragraphs: [{ id: generateId(), title: 'Primo Paragrafo', content: 'Inizia a scrivere qui...', font: 'Arial', align: 'left', linkedCharacterIds: [], linkedPlaceIds: [], startDate: '', endDate: '' }] }],
        characters: [{ id: generateId(), name: 'Protagonista', nickname: 'Eroe', bio: 'Nato il...', notes: 'Nessuna nota' }],
        places: [{ id: generateId(), name: 'Città Iniziale', description: 'Una ridente cittadina.' }]
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

// --- CHILD COMPONENTS (They don't need to change) ---

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
// ... All other child components (ConfirmationModal, BookLobby, etc.) remain unchanged ...
// NOTE: For brevity, I am omitting the other child components as they do not need changes.
// When you paste, ensure you keep them in your file.

// --- MAIN APP COMPONENT ---

export default function App() {
    //
    // --- 1. HOOKS DECLARATIONS (TUTTI QUI, IN CIMA) ---
    //
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

    // --- EFFECT HOOKS ---
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
            if (!user) setBooks({});
            return;
        }
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

    // --- CALLBACK HOOKS (Handlers for UI interaction) ---
    const updateActiveBookData = useCallback(async (updater) => {
        if (!activeBookId || !user || !books[activeBookId]) return;
        const currentBook = books[activeBookId];
        const updatedData = updater(JSON.parse(JSON.stringify(currentBook.data)));
        const updatedBook = { ...currentBook, data: updatedData, lastModified: Date.now() };
        setBooks(currentBooks => ({ ...currentBooks, [activeBookId]: updatedBook }));
        try {
            await setDoc(doc(db, "users", user.uid, "books", activeBookId), updatedBook, { merge: true });
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
        } catch (error) { console.error("Error creating book:", error); }
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
    }, []);
    
    // ... all other handler functions wrapped in useCallback ...
    // NOTE: For brevity, omitting the rest of the useCallback-wrapped handlers.
    // Ensure you move ALL your handler functions (addChapter, removeChapter, etc.) here
    // and wrap them in useCallback if they are passed as props.


    //
    // --- 2. EARLY RETURNS & RENDER LOGIC (DOPO TUTTI GLI HOOKS) ---
    //
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        return <FirebaseConfigError />;
    }

    if (isLoading && !user) {
        return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={64} /></div>;
    }

    if (!user) {
        return <AuthScreen />;
    }

    if (!activeBookId) {
        // NOTE: BookLobby and its props (like onCreateBook) are now defined outside the main render path.
        // We pass the memoized handlers (handleCreateBook, etc.) as props.
        return (
            <BookLobby 
                books={books}
                onSelectBook={handleSelectBook}
                onCreateBook={handleCreateBook}
                onDeleteBook={(id) => setBookToDelete(id)}
                // onExportAll and onImportAll need to be defined as useCallback too if passed
                isLoading={isLoading}
                onLogout={handleLogout}
            />
        );
    }
    
    const activeBookData = books[activeBookId]?.data;
    if (!activeBookData) {
        return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={64} /></div>;
    }
    
    // ... rest of the render logic ...
    return (
        <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
            {/* The rest of your JSX for the main editor view */}
        </div>
    );
}

// NOTE: You need to re-insert the definitions for ALL your child components here
// (ConfirmationModal, BookLobby, TimelineView, Sidebar, Editor, Toolbar, ExportModal)
// as they were in your original file.