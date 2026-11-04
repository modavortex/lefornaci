# Le Fornaci – nuovo sito

Proposta di nuovo sito per il centro commerciale **Le Fornaci Mega Shopping** di Beinasco (TO).
Creato con amore da **DamicoShop** e donato al centro.

## Cosa contiene

- **Home**: eventi in programma, come raggiungerci, "Scopri i negozi", vetrina con 4 posti in evidenza (a rotazione se nessuno è sponsor) e prossime aperture (visibili per 45 giorni).
- **Negozi e mappa** (`/negozi/`): mappa 3D interattiva dei due piani, con zoom e rotazione a mouse e touch, loghi sui locali, servizi (bagni, bancomat, ascensori, scale mobili) e ingressi. Sotto, l'elenco completo per settore.
- **Una pagina per ogni negozio** (`/negozi/<nome>/`): logo, descrizione, contatti, orari, posizione sulla mappa e negozi dello stesso settore. Se un dato manca, la sezione semplicemente non compare.
- **Eventi**, **Apri un negozio** (locali liberi, temporary e modulo di richiesta) e **Accesso operatori**.

Tutto è HTML statico: niente database e niente plugin, quindi niente che si rompa con gli aggiornamenti.

## Come si aggiorna

I contenuti stanno in tre file nella cartella `data/`:

| File | Cosa contiene |
|---|---|
| `data/negozi.json` | tutti i locali: numero, stato (`aperto`, `nuova_apertura`, `libero`), insegna, settore, descrizione, contatti, orari, foto, vetrina in evidenza |
| `data/centro.json` | orari del centro, come arrivare, contatti ed eventi |
| `data/mappa.json` | contorni dei locali, servizi e ingressi sulla mappa |

Dopo una modifica si rigenera il sito con:

```
python3 build.py
```

### Esempi

- **Un negozio cambia insegna**: in `data/negozi.json` si cambiano `nome`, `slug`, `categoria` e contatti del suo locale.
- **Un locale si libera**: `"stato": "libero"`. Sulla mappa diventa "Prossimamente in apertura" e compare in "Apri un negozio".
- **Nuova apertura**: `"stato": "nuova_apertura"` con `"creato_il": "AAAA-MM-GG"`. Resta nella home per 45 giorni.
- **Vetrina a pagamento**: `"in_evidenza": true` (massimo 4).

## Tracciare i locali sulla pianta

Lo strumento è in `/strumenti/traccia/`. Si sceglie un locale, si spostano gli spigoli o lo si ridisegna sulla planimetria, poi si preme **Scarica file** e si salva il risultato come `data/tracciati.json`. Al successivo `python3 build.py` la mappa usa i nuovi contorni, e lo spazio per i loghi viene ricalcolato da solo.

## Prima di andare online sul dominio ufficiale

1. In `build.py` impostare `ANTEPRIMA = False` (oggi il sito dice a Google di non indicizzarlo, per non fare concorrenza al sito attuale).
2. Impostare i reindirizzamenti 301 elencati in `docs/REINDIRIZZAMENTI.md`, per non perdere le visite che oggi arrivano da Google.
3. Collegare il modulo "Apri un negozio" e la newsletter alla casella della direzione.
4. L'accesso operatori diventa attivo con la versione su WordPress del centro.
