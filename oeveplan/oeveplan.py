#!/usr/bin/python
'''
Dette script laver en hjaelpefil man kunne bruge til at lave planlaegning af oeveweekender.

Scriptet tager en fil kaldet rollefordeling.txt som input. Denne skal vare paa foelgende format:

*navn paa sketch
- rollenavn1 navn1
- rollenavn2 navn2
-- sanger1 sangernavn1

altsaa:
	* foran titlen paa sketchen
	- foran en ikke-sanger rolle
	-- foran en sangerrolle

Navnet paa personen der har rollen skal staa efter rollenavnet og der maa ikke
vaere mellemrum efter navnet.

scriptet genrerer for samtlige sketches/sange en liste ved navn helper.txt paa foelgende format:

===============================================================
*sketch_m

skuespillere navn1, navn2, navn3
sangere navn1, navn3

- sketch0 i_0 (j_0) [k_0] navn2, (navn3), [navn1]
- sketch1 i_1 (j_1) [k_1]
- sketch2 i_2 (j_2) [k_2]
- osv....

hvor:
	m: er din sketch listen er genereret for
	n: sketchen der sammenlignes med
	i_n: Antallet af roller der er tilfaelles mellem sketch m og n
	j_n: Antallet af roller der er tilfaelles mellem sketch n og sangerne i m
	k_n: Antallet af sangere i n der ogsaa er sketch m
	Navnene efterfoelgende er de personer det gaar igen med samme konvention som foer.

Scriptet er lavet af Mads Fabricius Schmidt, CERM 12/13. Senest redigeret maj 2014.
Gi' ham endelig en bajer hvis du bruger det :-)
'''

#codecs bruges til at laese og skrive til filer paa en paen maade
import codecs
#collections giver os orderedDict
import collections

#Encoding burde vaere utf-8
ENCODING = 'utf-8'
#aabn filer
fil = codecs.open('rollefordeling.txt', encoding=ENCODING)
res = codecs.open('helper.txt','w', encoding=ENCODING)

#Aendr denne linie til True hvis du vil medtage selve sketchen
includesamesketch = False

#vi bruger OrderedDict for at faa skrevet ting i raekkefoelge. Kan erstattes med role_dict = dict()
role_dict = collections.OrderedDict()
songrole_dict = collections.OrderedDict()

#lav dicts med roller og sangere
title = ""
linenumber = 0
for line in fil:
    #Variabel der holder styr paa om der er noget paa linjen overhovedet, og printer hvis der ikke er noget.
	linenumber += 1
	validline = False
	if line[0:1]=='*':
		#foerste linje, gem titel uden endline
		title = line[1:-1]
		#print title
		validline = True
	if line[0:1]=='-':
		#Dette er en skuespiller eller sanger. Find sidste mellemrum og tag navnet 
		#derfra til slutningen af linjen uden sidste karakter der er et linjeskift
		index = line.rfind(' ')
		rollowner = line[index+1:-1]
		#Her opretter vi et nyt array hvis der ikke er nogen der har roller endnu, 
		#ellers tilfoejer vi til arrayet.
		if title in role_dict:
			role_dict[title].append(rollowner)
		else:
			role_dict[title] = [rollowner]
		validline = True
	if line[0:2]=='--':
		#Det samme som ved sangere
		index = line.rfind(' ')
		rollowner = line[index+1:-1]
		if title in songrole_dict:
			songrole_dict[title].append(rollowner)
		else:
			songrole_dict[title] = [rollowner]
		validline = True
	if not validline:
		print("Ingen rolle, sanger eller titel i linje " + str(linenumber) + ": " + line )

#role_dict indeholder nu {titel1:[navn1,navn2], titel2:[navn3,navn4] ,.... } for samtlige sketches og sange
#songroll indeholder alle sangere paa samme form
#man kan teste det ved at udkommentere en af foelgende linjer:
#print role_dict
#print songrole_dict

#Lad os finde den laengste titel. Dette bruges til at lave paen formatering i slutdokumentet.
longesttitle = 0
for item in role_dict:
	if len(item) > longesttitle:
		longesttitle = len(item)
tabs = (longesttitle+2) // 3

#Gaa igennem alle sketches
for item1 in role_dict:
	containssingers = False
	#item er navnet paa sketchen/sangen
	#skriv navnet i sangen/sketchen i res
	res.write('*' + item1 + '\n\n' + 'Skuespillere: ')
	rolls1 = role_dict.get(item1)
	for roll in rolls1:
		res.write(roll + ', ')
	res.write('\n')
	
	#Tjek om der er sangere
	if item1 in songrole_dict:
		#Der er sangere!
		containssingers = True
		res.write('Sangere: ')
		for roll in songrole_dict.get(item1):
			res.write(roll + ', ')
		res.write('\n')
	res.write('\n')
	
	
	#Det var de tre oeverste linjer hvor der nu staa:
	
	#*titel
	#
	#skuespillere: navn1, navn2,
	#sangere: navn1,
	#
	#Nedderste linje er kun med hvis der er sangere.
	#singers er True hvis der er sangere i sangen
	
	for item2 in role_dict:
		
		#taellere
		containsroll = 0
		containssinger = 0
		item2containssinger = 0
		
		#strenge til at skrive faelles skuespillere
		commonsactors = ''
		commonsingers = ''
		item2singers = ''
		
		samesketch = False
		if item1 == item2:
            #Samme sketch, skip?
			if not includesamesketch:		
				continue
			samesketch = True
		
		#Ordn Roller	
		rolls2 = role_dict.get(item2)
		for roll in rolls1:
			if roll in rolls2:
				commonsactors += roll + ', '
				containsroll = containsroll+ 1
				
		
		#Ordn sangere hvis der er nogle
		if containssingers:
			singers = songrole_dict.get(item1)
			for singer in singers:
				if singer in rolls2:
					commonsingers += '('+singer+'), '
					containssinger = containssinger + 1
					
					
		#Ordn sangere i den anden sang
		if item2 in songrole_dict:
			#Der er sangere i den sang jeg taeller paa, tjek hvormange tilfaelles der er
			#hvis man nu kun oever den anden med band
			singers = songrole_dict.get(item2)
			for singer in singers:
				if singer in rolls1:
					item2singers += '['+singer+'], '
					item2containssinger += 1
		
		#Hvis man medtager den samme sketch sletter vi hvad der er skrevet om skuespillere da det fylder for meget
		if samesketch:
			commonsactors = 'Samme Sketch -- alt er ens!'
			commonsingers = ''
			item2singers = ''
		
		#Lav en tabstring:
		tabstring = ''
		#Jeg aner ikke hvorfor det giver mening at dividere med 4 her men det virker perfekt
		numberoftabs = tabs - (len(item2)+2)//4
		for x in range(1 , numberoftabs):
			tabstring += '\t'
			
		#Skriv en linje pr sang/sketch: Det her er ret grimt
		res.write(
		'- ' +  															#start
		item2 + 															#Navn paa sketch/sang
		tabstring+ 															#et antal tabs
		str(containsroll) + 												#i
		' ('+ 																# parantes (doh')
		str(containssinger)+ 												#antal sangere
		') [' + 															#flere paranteser
		 str(item2containssinger) + 										#sangere i anden sang
		'] ' +																#slut paranteser
		commonsactors + ' '+ commonsingers + ' ' + item2singers + '\n') 	#faelles skuespillere og sangere i parantes
	
	#afsluttende streg, videre til naeste sketch
	res.write('\n\n===============================================================\n\n')

#Flush!
res.flush()
		
