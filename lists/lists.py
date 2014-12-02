#!/usr/bin/python
'''
Script til at lave liste over rekvisitter og roller i revytex

Antagelser:
- Du skal oprette en mappe der hedder lister
- Alle filer er encodet med utf-8
- Masterdokumentet hedder 'manus.tex'
- Alle sketches bliver input direkte ind i masterfilen uden .tex endelse og ligger ikke i undermapper
- Der er en ny linje efter \begin{...}[...]{...} i alle sketches og sange

Dette script gennererer tre filer, samt koerer pdflatex paa manus:
- roller.tex: En liste over samtlige roller i revyen
- rekvisitter.tex: En liste over samtlige rekvisitter i revyen
- sange.txt: En liste over samtlige originalsange i revyen.
- Antallet af roller bliver skrevet ud i slutningen af roller.tex. Dette kan nok
ikke bruges til vildt meget.

Det kan anbefales at lave noget mulitculoumn paa roller og rekvisitter.
sange.txt er endnu ikke lavet til at blive sat ind i et tex dokument.

Dette script er lavet af Mads Fabricius, CERM 2012-2013, sidst redigeret maj 2014
'''
from subprocess import call
import codecs

#Definer encoding og besked i toppen af de tre generede filer
ENCODING = 'utf-8'
MESSAGE = '%This file was autogenerated by lists.py. \n%Dont edit!\n'

#aabn manus. Default opfoersel i python er readonly, og det er nok smart
manus = codecs.open('manus.tex', encoding=ENCODING)

#opret de tre filer. Hvis de eksisterer i forvejen vil dette slette alt indhold af dem
roller = codecs.open('lister/roller.tex','w', encoding=ENCODING)
rekvisitter = codecs.open('lister/rekvisitter.tex','w', encoding=ENCODING)
lyde = codecs.open('lister/lyde.tex','w', encoding=ENCODING)
sange = codecs.open('lister/sange.txt','w', encoding=ENCODING)

#Skriv besked oeverst i de tre filer
roller.write(MESSAGE)
rekvisitter.write(MESSAGE)
sange.write(MESSAGE)
lyde.write(MESSAGE)

#hjealpecounter til at taelle antallet af roller
rollecounttotal = 0

#gaa hele hovedfilen igennem linje for linje
for line in manus:
	if line[0:7] == '\input{':
		#find filnavn og aabn filen
		#lige praecist dette er meget primitivt og burde laves smart/rigtigt!
		filename= line[7:-2] + '.tex'
		fil = codecs.open(filename, encoding=ENCODING)

		#variabler der fortaeller om linjen er en rolle eller rekvisit.
		rollecount = 0
		rekvisitcount = 0
		lydcount = 0
		titel = ""
		for filline in fil:
			#find titel paa sketch eller sang
			if filline[1:12] == 'begin{Sang}' or filline[1:14] == 'begin{Sketch}':
				index = filline.rfind('{')
				indexend = filline.rfind('}')
				titel = filline[index + 1:indexend]

				## Hvis det er en sang finder vi titlen paa originalsangen
				if filline[1:12] == 'begin{Sang}':
					sang = filline[filline.rfind('[') + 1:filline.rfind(']')]
					sange.write(sang + '\n')
			#for begge disse gaelder af hvis count er 0 har vi ikke set noget
			#1 hvis vi har set begin. alle items vil da blive skrevet
			#hvis count er 2 er vi kommet til end og afslutter listen
			#Vi skriver foerst titlen hernede da det foerst er her vi er sikre paa der er en
			#rolleliste eller rekvisitliste i sketchen
			if 'Persongalleri' in filline:
				rollecount += 1
				if rollecount == 1:
					roller.write('\subsection*{' + titel + '}\n')
					roller.write("""
					\\vspace{-0.1cm}
					  \\begin{list}{$\\bullet$}{%
					    \setlength{\itemsep}{0mm}%
					    \setlength{\parsep}{0mm}%
					}""" + '\n')
				if rollecount == 2:
					roller.write("""\end{list}%\n""")
			if 'Rekvisitter' in filline:
				rekvisitcount += 1
				if rekvisitcount == 1:
					rekvisitter.write('\subsection*{' + titel + '}\n')
					rekvisitter.write( """
					\\vspace{-0.1cm}
					\\begin{list}{$\Box$}{%
					    \setlength{\itemsep}{0mm}%
					    \setlength{\parsep}{0mm}%
					}""" + '\n')
				if rekvisitcount == 2:
					rekvisitter.write("""\end{list}%\n""")
			if 'Lydeffekter' in filline:
				lydcount += 1
				if lydcount == 1:
					lyde.write('\subsection*{' + titel + '}\n')
					lyde.write( """
					\\vspace{-0.1cm}
					\\begin{list}{\Tape}{%
					    \setlength{\itemsep}{0mm}%
					    \setlength{\parsep}{0mm}%
					}""" + '\n')
				if lydcount == 2:
					lyde.write("""\end{list}%\n""")

			#Det er her items bliver tilfoejet
			#Hvis vi har finder et item finder vi lige ud af hvor det skal staa
			#Dette tjekkes vha counterne
			if '\item' in filline:
				if rollecount == 1:
					roller.write(filline)
					rollecounttotal += 1
				if rekvisitcount == 1:
					rekvisitter.write(filline)
				if lydcount == 1:
					lyde.write(filline)

#Print total antal roller
roller.write("""\n
\\vspace{2cm}
\n
Total antal roller i revyen: """ + str(rollecounttotal))

#Flush for god ordens skyld
rekvisitter.flush()
roller.flush()
sange.flush()

#koer pdflatex
call(['pdflatex', 'manus.tex'])

#Skriv antal roller til terminalen
print('Antal Roller: ' + str(rollecounttotal))
