# Campaign settings

A tool for handling, for frontend/backend setup check the specific readme inside their relative folder.

- [Read backend guide](./backend/README.md)
- [Read frontend guide](./frontend/README.md)

# TODO

## I18N

- tradurre tutto il sito in italiano, le traduzioni sono tutte lato FE
- montare sistema I18N
- gli endpoint devono rispondere codici di errore e non messaggi in lingua

## SIGNUP

- restituire nel toast message il messaggio d'errore specifico del server
- se ho già attivato la mail, activateemail deve rispondere che l'utente è già attivo
- in caso di errore dati, il messaggio toast e il box errori validazione danno un senso di sovrapposizione
- creare un cron che cancella tutti gli account creati da più di un mese che non hanno mai attivato il proprio account
