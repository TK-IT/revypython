Hvis en titel indeholder kolon, eller et rollenavn får et komma,
giver manus.py en fejl, og destruktøren skal rette det i
lister/rolleliste.txt.


Alle sketches og sange skal angive en tid.
Tid angives som \tid{m:ss}, f.eks. \tid{4:20} for 4 minutter og 20 sekunder.

Alle sange skal angive bandkommentarer:
\begin{Bandkommentar}
Dette er en bandkommentar. YouTube, format, osv.
\end{Bandkommentar}

Alle sketches og sange skal angive, om de er på forscene eller fuld scene
vha. \forscene{kvitter} og \fuldscene{kvitter}.



lyde.tex
rekvisitter.tex
rolleliste.txt
rolleprioriteringer.txt
roller.csv
roller.tex
sange.txt
scenes.json
sceneskift.csv
tid.txt

lyde.tex, rekvisitter.tex, roller.tex kendes fra seneste manuskripter

(scenes.json er til fejlfinding...)

tid.txt viser hvor meget materiale der er i manus.
Skriv \tid{6:40}

rolleliste.txt sendes ud til rolleprioriteringen (med destruktørens rettelser)

Revyister indsender rolleprioriteringer.txt
rolleprioriteringer.py genererer... rolleprioriteringer.txt

roller.csv bruges til rollefordelingsmødet
Magisk regneark: rollefordeling.ods/xlsx

sange.txt sendes til bandet (indeholder melodi og bandkommentarer til sange)
\begin{Bandkommentar}
\end{Bandkommentar}

sceneskift.csv bruges til at planlægge sceneskift.csv
\forscene{kvitter} \fuldscene{kvitter}

