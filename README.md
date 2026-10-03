# Symphony of Decay

Sandbox musicale per browser: le collisioni tra oggetti fisici producono suoni. Include emettitori con sequencer, corde/catene/barre, editor di scene, annulla/ripristina e registrazione audio.

## Avvio

Aprire Symphony_of_decay.html in un browser moderno. Interagire con la pagina per attivare l'audio. Tutte le risorse necessarie sono nella cartella del progetto; mantenere anche la cartella vendor accanto alla pagina.

Le scene e i timbri personalizzati sono salvati nello spazio locale del browser. Browser, profili e origini diversi usano archivi distinti. Cancellare i dati del browser elimina questi salvataggi. La registrazione scarica un file audio, usando un formato supportato dal browser o il ripiego WAV.

## Interfaccia

La barra in alto raccoglie pausa, annulla/ripristina, registrazione, aiuto e inquadratura della scena. La palette in basso offre accesso rapido alle forme; su telefoni stretti scorre orizzontalmente. Il pannello Strumenti organizza i controlli in Crea, Suono, Mondo e Scene. Le schede si possono cambiare anche con le frecce della tastiera. Lo sfondo rispetta la preferenza del sistema per il movimento ridotto.

Per aprire un'anteprima locale verificabile anche nel browser integrato, eseguire dalla cartella del progetto:

```text
node tools/preview.cjs
```

Aprire http://127.0.0.1:5173. L'anteprima serve solo i file pubblici del gioco ed è accessibile esclusivamente dal computer locale.

## Struttura

- languages.js: traduzioni inglese/italiano.
- storage.js: accesso protetto all'archiviazione locale.
- audio.js: sintesi, effetti, scale, timbri e registrazione.
- physics-world.js: mondo fisico, camera e interazioni.
- objects.js: oggetti, strumenti, selezione e sequencer.
- scenes.js: serializzazione, salvataggi e cronologia.
- background.js: sfondo animato.
- main.js: inizializzazione, avanzamento fisico e disegno.
- style.css: stili di base e temi.
- studio.css: grafica dello studio e layout responsive.
- studio-ui.js: schede, palette rapida e accessibilità.

Gli script condividono lo stato globale e devono mantenere l'ordine dichiarato nella pagina HTML. La fisica usa passi di 1/60 di secondo, indipendenti dalla frequenza di rendering, con quattro sottopassi per passo e un massimo di sei passi di recupero per fotogramma.

## Verifiche

Con Node.js installato, eseguire dalla cartella del progetto:

```text
node tests/regression.cjs
```

I controlli usano il motore Planck effettivo e verificano frequenze di rendering diverse, pausa, salvataggi malformati, errori del motore durante il caricamento, spazio locale esaurito, conservazione del movimento, pulizia della scena, annulla/ripristina e interazioni interrotte. Non verificano la resa grafica né l'ascolto nel browser.

I salvataggi di versione 1 restano compatibili; i nuovi campi di movimento sono opzionali. I vecchi salvataggi senza velocità ripristinano gli oggetti fermi.

## Dipendenza

La copia locale di [Planck.js](https://github.com/piqnt/planck.js) è planck-js 1.3.0, distribuita da jsDelivr. La licenza MIT e i crediti originali sono conservati in vendor/PLANCK-LICENSE.txt. La cartella backup contiene le copie precedenti ed è lasciata invariata.

Il motore audio limita a 40 le voci simultanee, comprese quelle in dissolvenza. Se una raffica supera il limite, una voce viene sfumata e gli impatti in eccesso vengono ignorati finché si libera un posto. Questo evita di accumulare sorgenti audio durante i picchi; il test automatico simula 10.000 richieste con note e percussioni, ma non misura i dropout del dispositivo audio reale.

Nuovi comandi: «Sposta camera» nella palette permette il pan con il pulsante sinistro o un dito. Il tasto centrale rimane disponibile. «Ferma tutti i suoni», in Suono, mette la scena in pausa e interrompe le code di riverbero e delay; Play riprende la scena. Il contatore «Voci audio» segnala quando vengono ignorati alcuni impatti.

Il sequencer supporta annulla/ripeti per pad, trascinamenti (un solo passaggio di undo), preset, lunghezza, rotazione, incolla e banchi. L’editor dell’emitter si riapre dopo il ripristino. Ambient 16 e Syncopated 16 sono disponibili tra i preset. L’autosalvataggio avviene ogni 30 secondi e quando la pagina viene nascosta o lasciata.
