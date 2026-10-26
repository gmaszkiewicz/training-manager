## TM-PROJECT - MVP
Koncepcja TRAINING MANAGER powstała w celu łatwiejszego raportowania wyników treningowych dla trenera oraz trenującego.
Plan jest taki, aby aplikacja składa się z 3 modułów: dziennik żywienia, dziennik pomiarów ciała, dziennik wyników treningowych.
Globalne założenia to profile ternującego i trenera z własnymi rolami, ekranami podglądu.

1) MODUŁ 1 - dziennik pomiarów ciała (skupmy się na razie na zrealizowaniu tego modułu)
- moduł ma za zadanie wyświetlanie listy pomiarów: daty wpisu, wagi, obwodu klatki, talii, ramion, uda, łydki, biodra oraz obwód na wys. pępka
- możliwość dodania nowego wpisu, edycję poprzednich oraz ewentualne usunięcie wpisu przez trenującego
- obok wpisu konkretnego pomiaru powinna znajodwać się różnica jaka zainstaniała między nowym, a poprzednim wpisem
- obok wpisu znajduje się miejsce na dodatkowe informacje od trenującego (notatki)

### Główny problem
- niewygonde przesyłanie linków do wyników zamiast jednego wspólnego systemu do podglądu i raportowania
- całe arkusze danych bez spersonalizowanych funkcji filtrowania
- waga oraz obwody, które raportuje trenujący lub widzi trener trzeba porównywać samemu

### Najmniejszy zestaw funkcjonalności
- prosty system konta z rolą trenera, który będzie miał podgląd wpisów podopiecznych
- prosty system konta z rolą trenującego, który będzie mógł dodwać wpisy, edytować oraz usuwać
- porównanie nowego wpisu z poprzednim pomiarem ciała poprzez strzałki w góre + różnica oraz dół + różnica
- obok każdego nowego wpisu trenującego miejsce na dodatkowe informacje

### Co NIE wchodzi w zakres MVP
- odpowiadanie przez trenera na dodatkowe informacje od trenującego
- obok wpisu miejsce na spersonalizowane pytania od trenera, na które odpowiada trenujący tworząc wpis
- moduł 2 oraz moduł 3
- aplikacje mobilne (na początek tylko web)

### Kryteria sukcesu
- w pełni działający system raportowania pomiarów ciała przez trenującego