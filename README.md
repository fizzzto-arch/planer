# Planer

Czytelny plan zajęć dla studentów PW, zasilany danymi z USOS.

## Uruchomienie lokalne

```
npm install
npm run dev
```

Strona publikuje się automatycznie na GitHub Pages po każdym pushu na `main`.

## Tryb testowy

W wersji deweloperskiej adres z `?mock` (np. `http://localhost:5173/?mock`) zamienia Firebase
na udawane konto w pamięci przeglądarki. Pozwala sprawdzić notatki, terminy i zmiany planu
bez logowania. Ten kod nie trafia do wersji na GitHub Pages.
