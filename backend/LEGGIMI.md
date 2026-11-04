# Motore del sito (Google Apps Script + Foglio Google)

Il sito resta statico (GitHub Pages). Le parti "vive" passano da un piccolo motore gratuito su Google:
- moduli **Apri il tuo spazio** (negozio fisico, temporary, banchetto) → risposta automatica al richiedente + email ai destinatari scelti
- **Vetrina** della home (4 negozi in evidenza) scelta dall'amministrazione
- **Area riservata**: utente `admin` + un accesso per ogni locale (codici generati e rigenerabili)
- **Schede negozio** aggiornate dai negozianti (telefono, WhatsApp, orari, descrizione…)

Tutto è salvato in un Foglio Google ("Le Fornaci – Motore sito") con le schede: Richieste, Destinatari, Vetrina, Accessi, Schede, Registro.

## Installazione (10 minuti, una volta sola)
1. Con l'account Google che spedirà le email, apri https://script.google.com → **Nuovo progetto**. Nominalo "Le Fornaci – Motore".
2. Cancella il contenuto di `Codice.gs` e incolla tutto il file `backend/Codice.gs` di questo repository. Salva.
3. In alto scegli la funzione **setup** → **Esegui**. Google chiede le autorizzazioni (Fogli, invio email, connessioni esterne): accetta.
   Il registro di esecuzione mostra il link del Foglio creato.
4. **Distribuisci → Nuova distribuzione → Applicazione web**: Esegui come **Me**, Chi ha accesso **Chiunque**. Copia l'URL che finisce con `/exec`.
5. Incolla l'URL in `data/centro.json` alla voce `"motore"`, poi `python3 build.py` e pubblica.

## Primo accesso
- Area riservata: `/admin/` — utente **admin**, password iniziale **LeFornaci2026** (va cambiata al primo accesso).
- Password dimenticata: "Password dimenticata?" invia un codice all'indirizzo di recupero (costante `EMAIL_RECUPERO` in Codice.gs).
- Accessi dei negozi: scheda **Accessi negozi**. L'utente è il numero del locale (es. `40`); il codice si vede solo quando premi **Nuovo codice** — copialo e consegnalo al negozio. Il vecchio smette di funzionare.
- **Destinatari**: aggiungi una o più persone/agenzie e scegli per quali tipi di richiesta ricevono l'email.

## Aggiornare il codice del motore
Incolla la nuova versione di Codice.gs, poi **Distribuisci → Gestisci distribuzioni → Modifica → Nuova versione**. L'URL resta lo stesso.

## Sicurezza
Password salvate solo come impronta (SHA-256 con sale), sessioni di 6 ore, massimo 8 tentativi ogni 10 minuti per utente, campo anti-spam nascosto nei moduli.
Se il motore non risponde il sito continua a funzionare: vetrina a rotazione automatica, moduli che aprono l'email.
