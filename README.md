# Zahlenschwarm

Trainer für das Einmaleins und das Kopfrechnen für die Klassen 3 und 4 (8 bis 10 Jahre).
Die Aufgaben erzeugt das Programm selbst. Die Kinder üben in ihrem Tempo. Bei einem Fehler zeigt die Seite einen Rechenweg, statt nur „falsch“ zu sagen.
Begleiter ist Tupfi, ein kleiner gelber Fisch aus dem Schwarm. Es gibt keine Punkte, keinen Zeitdruck und keine Ranglisten: Für jede Aufgabe, die sicher sitzt, kommt ein Fisch in den eigenen Schwarm.

**Adresse:** https://setsna.github.io/zahlenschwarm/

Schwesterseite der [Lernlagune](https://lernlagune.de), zusammen mit KI-Korallenriff, Perlentaucher und Riff-Akten.

## Inhalte

Jedes Kind wählt beim Anlegen seine Klasse. Ändern lässt sie sich nur im Tauchbuch. Kinder aus Klasse 3 sehen keine Aufgaben aus Klasse 4.

| Bereich | Klasse 3 | Klasse 4 zusätzlich |
|---|---|---|
| Einmaleins | alle Reihen von 1 bis 10, einzeln oder gemischt | mit Stufenzahlen: 30 · 4, 300 · 4, 3 000 · 4, 30 · 40 |
| Geteilt | die Umkehraufgaben, „durch 2“ bis „durch 10“ | mit Stufenzahlen: 120 : 4, 1 200 : 4, 12 000 : 4, 1 200 : 40 |
| Plus und Minus | im Kopf bis 1000, sechs Aufgabenarten (Einer, Zehner, Hunderter, mit und ohne Übergang) | bis 1 000 000: Tausender, Hunderter, Zehntausender, Ergänzen bis zur Stufenzahl (3 600 + ? = 10 000) |

Grundlage ist der Lehrplan Thüringen Mathematik Grundschule (Leitidee Zahl und Operation). Klasse 4 folgt dem Ziel, die Grundaufgaben auf analoge Aufgaben im großen Zahlenraum zu übertragen.

## So wird geübt

- **Üben nach Lernstand:** Jede Aufgabe wandert durch fünf Stufen (nach Leitner). Was ein Kind noch nicht sicher kann, kommt öfter und an späteren Tagen wieder, sichere Aufgaben seltener. Als sicher gilt eine Aufgabe erst, wenn das Kind sie an mehreren Tagen zügig und ohne Tipp gelöst hat.
- **Fehler erklären:** Nach „Fast!“ steht die richtige Zahl in der Aufgabe und darunter ein Rechenweg, beim Einmaleins über Kernaufgaben (mal 2, mal 5, mal 10), in Klasse 4 über den Stellenwert („3 Zehner · 4 = 12 Zehner“).
- **Tupfis Tipps:** drei Stufen, die nie die Lösung verraten, zum Teil mit einem Bild aus Fischschwärmen.
- **Bedenkzeit:** „Prüfen“ ist kurz gesperrt und füllt sich langsam, damit niemand rät.
- **Heute bereit für dich:** Die Startseite empfiehlt, was als Nächstes dran ist.
- **Tauchbuch:** Schwarm, Stempel für jede geschaffte Reihe mit Selbsteinschätzung („Ganz leicht“, „Geht gut“, „Noch wackelig“), „Das kann ich schon“ und die Lernzeit.
- Eigenes Ziffernfeld mit großen Tasten statt der iPad-Tastatur, auch mit der Tastatur bedienbar (Ziffern, Rücktaste, Enter).

## Was liegt wo?

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst der Seite |
| `js/config.js` | **Alle Einstellungen**: Klassen, Reihenfolge der Reihen, Bedenkzeit, Pausen, Lernstufen, Ziffernzahl je Aufgabenart |
| `js/lernstand.js` | Lernlogik: Stufen, Fälligkeit, Auswahl der nächsten Aufgabe, „Heute bereit für dich“ |
| `js/speicher.js` | Speicher im Browser, je Kind ein Eintrag, Vorschau |
| `js/aufgaben.js` | Erzeugt alle Aufgaben, berechnet die Lösung und schreibt Erklärungen und Tipps |
| `js/tauchbuch.js` | Fische, Stempel, „Das kann ich schon“, Lernzeit |
| `js/ueben.js` | Üben-Ansicht mit Ziffernfeld, Rückmeldung und Tipps |
| `js/app.js` | Alle anderen Ansichten und der Bereich „Für Lehrkräfte und Eltern“ |
| `css/tokens.css` | Farben, Schriften, Größen und Abstände an einer Stelle |
| `css/zs.css` | Das gesamte Aussehen |
| `bilder/tupfi.png`, `bilder/grund-*.webp` | Tupfi und der Unterwasser-Hintergrund (Canva) |
| `manifest.webmanifest`, `bilder/app-*.png` | Für „Zum Home-Bildschirm“: Name, Farben und App-Symbol (Tupfi) |
| `schriften/` | Andika und Libre Caslon Text mit Lizenztexten (SIL OFL) |
| `datenschutz.html`, `impressum.html` | Rechtstexte (Datenschutz kurz für Kinder und ausführlich) |

Die Testseiten (Aufgaben-Test, Lernlogik-Test, Rauchtest) liegen nur lokal und nicht auf GitHub, weil `.gitignore` sie sperrt.

## Vorschau

`?vorschau=N` zeigt einen Stand mit N sicheren Einmaleins-Aufgaben, `&klasse=4` den Stand eines Kindes aus Klasse 4, zum Beispiel:
https://setsna.github.io/zahlenschwarm/?vorschau=30&klasse=4

In der Vorschau wird nichts gespeichert.

## Gestaltung

Gedacht für iPads (hochkant und quer) und die Tafel. Die Seite richtet sich nach der Bildschirmgröße:

| Lage und Breite | Gerät |
|---|---|
| hochkant, bis 600 px | Handy (kein Zielgerät) |
| hochkant, ab 601 px | iPad hoch |
| quer | iPad quer, Laptop |
| quer, ab 1600 px | Tafel (Aufgabe und Rechenweg größer) |

Alle Größen hängen an einem Maßstab (`--s` in `css/tokens.css`), der sich nach Breite und Höhe des Bildschirms richtet.

Die Aufgabenansicht bleibt ruhig: nur Aufgabe, Ziffernfeld und Rückmeldung. Lange Aufgaben aus Klasse 4 werden kleiner gesetzt, damit sie in eine Zeile passen. Zahlen ab 1000 stehen mit schmalem Abstand (12 000).
Alles, was man antippt, ist ein echter Knopf und mindestens 48 px hoch. Animationen sind sparsam und richten sich nach `prefers-reduced-motion`.

## Wo der Fortschritt liegt

Nur im Browser des Geräts, unter dem Schlüssel `zahlenschwarm-v1` im `localStorage`. Für jedes Kind werden gespeichert: Vorname, Klasse, Lernstand je Aufgabe, Schwarm, Stempel mit Selbsteinschätzung und Lernzeiten.
Die Kinder arbeiten auf den iPads mit eigenen Accounts, deshalb reicht im Normalfall ein Kind pro Speicher. Sind im selben Browser mehrere Kinder angelegt, fragt die Seite „Wer übt heute?“ (die Wahl gilt für die Sitzung, `sessionStorage`). Einen Passwortschutz zwischen den Kindern gibt es nicht.
Die Seite bittet den Browser per `navigator.storage.persist()`, die Daten nicht von selbst zu löschen. Ob er zustimmt, entscheidet der Browser.
Laut WebKit löscht Safari den Speicher einer Webseite, wenn sie an sieben Tagen, an denen Safari benutzt wurde, nicht geöffnet wurde. Seiten, die über das Symbol auf dem Home-Bildschirm starten, sind davon ausgenommen (auf dem iPad noch nicht über mehrere Tage getestet). Die Kinder starten den Zahlenschwarm deshalb am besten von Anfang an über das Symbol auf dem Home-Bildschirm.
Es gibt keine Anmeldung, keine Datenbank und keine Sicherungsdatei, und die Stände wandern nicht zwischen Geräten. „Alles löschen / Neu anfangen“ im Tauchbuch löscht nur den Stand des gewählten Kindes.

## Datenschutz

Die Seite setzt keine Cookies und lädt nichts von fremden Servern nach, auch die Schriften liegen hier im Repository.
**Wer ändert, welche Daten gespeichert werden, oder einen neuen Dienst einbindet, muss `datenschutz.html` mitändern.**

## Nach einer Änderung: Versionsnummer hochzählen

Browser merken sich `js` und `css` eine Weile und liefern sonst die alte Fassung aus.
Deshalb hängt hinter jeder lokalen `js`- und `css`-Datei in `index.html`, `impressum.html` und `datenschutz.html` ein `?v=25`.
**Wer etwas an `js` oder `css` ändert, zählt diese Zahl in allen drei Dateien um eins hoch.**
Bilder haben eine eigene Nummer: `bildStand` in `js/config.js`.

Direkt nach dem Hochladen kann die Seite noch ein paar Minuten alt sein, weil auch `index.html` kurz zwischengespeichert wird.

## Hochladen

`.gitignore` sperrt zunächst alles und gibt nur die fertige Seite frei.
Arbeitsdateien und Tests bleiben dadurch lokal. Eine neue Datei oder ein neuer Ordner auf oberster Ebene muss dort erst eingetragen werden.

## Technik

Reines HTML, CSS und JavaScript ohne Framework und ohne Build-Schritt. Gehostet auf GitHub Pages.
Tupfi und der Hintergrund sind mit Canva erstellt. Die Schriften Andika und Libre Caslon Text stehen unter der SIL Open Font License, die Lizenztexte liegen in `schriften/`.

Alle Seiten tragen `<meta name="robots" content="noindex, nofollow">`. Die Seite ist öffentlich erreichbar, soll aber nicht über Suchmaschinen gefunden werden.
