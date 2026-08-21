import type { Metadata } from "next";
import Link from "next/link";

import { DocumentShell } from "@/components/public/document-shell";

export const metadata: Metadata = {
  title: "Standardy Ochrony Małoletnich | Pracownia Twórcza Pozytywka",
  description: "Pełna wersja Standardów Ochrony Małoletnich Pracowni Twórczej Pozytywka.",
};

export default function ChildProtectionStandardsPage() {
  return (
    <DocumentShell
      eyebrow="Pracownia Twórcza Pozytywka · Iwona Pilarz"
      title="Standardy Ochrony Małoletnich"
      meta="Wersja 1.0 · przyjęta 20 sierpnia 2026 r. · osoba odpowiedzialna: Iwona Pilarz · przegląd nie rzadziej niż raz na 2 lata oraz po poważnym zdarzeniu lub zmianie prawa albo procesu."
    >
      <p className="not-typeset mt-6 rounded-2xl border border-border bg-muted/45 p-4 text-sm leading-6">
        Dla dzieci i młodzieży przygotowaliśmy także{" "}
        <Link
          className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
          href="/standardy-ochrony-maloletnich/dla-dzieci"
        >
          krótszą i prostszą wersję zasad bezpieczeństwa
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2>1. Cel i zakres</h2>
        <p>
          Standardy obowiązują wszystkie osoby dopuszczone przez Pozytywkę do działalności
          związanej z edukacją artystyczną, rozwijaniem zainteresowań, opieką lub innym bezpośrednim
          kontaktem z małoletnimi.
        </p>
        <p>Celem jest:</p>
        <ul>
          <li>zapewnienie bezpiecznych i szanujących relacji,</li>
          <li>zapobieganie krzywdzeniu,</li>
          <li>szybkie reagowanie na podejrzenie krzywdzenia,</li>
          <li>jasne wskazanie odpowiedzialności personelu,</li>
          <li>zapewnienie dzieciom i opiekunom dostępnej informacji o zasadach bezpieczeństwa.</li>
        </ul>
        <p>
          Standardy są niezależne od publicznego systemu zapisów. Dokumentacja incydentów, rejestry
          sprawdzeń i informacje z KRK nie są przechowywane w rejestrze zapisów.
        </p>
      </section>

      <section>
        <h2>2. Odpowiedzialność</h2>
        <p>Iwona Pilarz:</p>
        <ul>
          <li>odpowiada za wdrożenie i przegląd Standardów,</li>
          <li>przygotowuje lub zapewnia przygotowanie personelu do ich stosowania,</li>
          <li>przyjmuje zgłoszenia dotyczące bezpieczeństwa małoletnich,</li>
          <li>koordynuje interwencje i dokumentowanie zdarzeń,</li>
          <li>odpowiada za wymagane zawiadomienia do właściwych instytucji,</li>
          <li>kontroluje wykonanie procedury weryfikacji osób dopuszczanych do pracy z małoletnimi.</li>
        </ul>
        <p>
          Jeżeli zgłoszenie dotyczy Iwony Pilarz lub zachodzi konflikt interesów, osoba zgłaszająca
          nie przekazuje sprawy osobie, której dotyczy podejrzenie. Zgłoszenie należy skierować
          bezpośrednio do właściwego organu publicznego odpowiedniego do charakteru zagrożenia, a
          dokumentację wewnętrzną zabezpiecza osoba nieobjęta podejrzeniem upoważniona do tego
          zadania.
        </p>
      </section>

      <section>
        <h2>3. Weryfikacja personelu przed dopuszczeniem do pracy z małoletnimi</h2>
        <p>
          Przed nawiązaniem stosunku pracy lub dopuszczeniem osoby do działalności, której
          rzeczywiste obowiązki obejmują wychowanie, edukację, opiekę, sport lub rozwijanie
          zainteresowań małoletnich, Pozytywka wykonuje obowiązki z art. 21 ustawy o przeciwdziałaniu
          zagrożeniom przestępczością na tle seksualnym i ochronie małoletnich.
        </p>
        <p>W szczególności:</p>
        <ol>
          <li>organizator sprawdza wymagane rejestry z dostępem ograniczonym,</li>
          <li>osoba przedstawia informację z Krajowego Rejestru Karnego w wymaganym ustawą zakresie,</li>
          <li>dla osób związanych z innymi państwami wykonuje się dodatkowe obowiązki przewidziane ustawą,</li>
          <li>
            wymagane informacje i oświadczenia są dokumentowane w aktach osobowych albo odrębnej
            dokumentacji osoby dopuszczonej do działalności,
          </li>
          <li>
            dokumentów tych nie kopiuje się do systemu rejestracji uczestników, GitHub, zwykłych
            komunikatorów ani ogólnych dysków projektowych.
          </li>
        </ol>
        <p>Dopuszczenie do kontaktu z małoletnimi bez zakończonej wymaganej procedury jest zabronione.</p>
      </section>

      <section>
        <h2>4. Bezpieczne relacje personel - małoletni</h2>
        <p>Personel:</p>
        <ul>
          <li>traktuje dziecko z szacunkiem, bez zawstydzania i poniżania,</li>
          <li>komunikuje zasady zajęć jasno i adekwatnie do wieku,</li>
          <li>respektuje granice fizyczne i emocjonalne dziecka,</li>
          <li>reaguje na dyskryminację, przemoc, wyśmiewanie i wykluczenie,</li>
          <li>
            uwzględnia prawo dziecka do odmowy kontaktu fizycznego, jeżeli nie jest on konieczny dla
            bezpieczeństwa,
          </li>
          <li>
            stosuje kontakt fizyczny wyłącznie wtedy, gdy jest bezpieczny, adekwatny do zajęć i
            sytuacji oraz nie narusza godności dziecka,
          </li>
          <li>
            prowadzi komunikację z uczestnikiem w sposób profesjonalny i możliwy do wyjaśnienia
            rodzicowi lub opiekunowi.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Zachowania niedozwolone</h2>
        <p>Niedozwolone są w szczególności:</p>
        <ul>
          <li>jakakolwiek przemoc fizyczna lub psychiczna,</li>
          <li>kara cielesna,</li>
          <li>
            kontakt seksualny, seksualizowanie, komentarze o charakterze seksualnym lub
            udostępnianie takich treści,
          </li>
          <li>upokarzanie, grożenie, szantażowanie lub ośmieszanie,</li>
          <li>faworyzowanie w zamian za prywatne korzyści lub budowanie tajnej relacji z dzieckiem,</li>
          <li>proponowanie alkoholu, nikotyny, środków odurzających lub innych substancji niedozwolonych,</li>
          <li>prywatne spotkania z małoletnim poza uzasadnionym procesem zajęć bez wiedzy opiekuna,</li>
          <li>utrzymywanie ukrytej, nieuzasadnionej relacji przez prywatne komunikatory,</li>
          <li>fotografowanie lub publikowanie wizerunku poza odrębnym, zgodnym z prawem procesem,</li>
          <li>
            ujawnianie innym uczestnikom lub osobom postronnym prywatnych informacji o dziecku lub
            jego rodzinie.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Komunikacja elektroniczna</h2>
        <ul>
          <li>
            komunikacja organizacyjna z małoletnimi powinna w miarę możliwości odbywać się przez
            kanał znany rodzicowi lub opiekunowi,
          </li>
          <li>wiadomości muszą mieć związek z działalnością Pozytywki,</li>
          <li>nie prowadzi się tajnych lub seksualizowanych rozmów,</li>
          <li>
            nie wymaga się od dziecka przesyłania prywatnych zdjęć lub materiałów niezwiązanych z
            zajęciami,
          </li>
          <li>
            jeżeli uczestnik zgłasza zagrożenie w wiadomości, personel zachowuje treść w zakresie
            niezbędnym do interwencji i nie rozpowszechnia jej dalej bez potrzeby.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Relacje między małoletnimi</h2>
        <p>Pozytywka nie akceptuje:</p>
        <ul>
          <li>przemocy fizycznej,</li>
          <li>nękania i uporczywego wyśmiewania,</li>
          <li>gróźb,</li>
          <li>wymuszania,</li>
          <li>zachowań seksualnych naruszających granice drugiej osoby,</li>
          <li>dyskryminacji,</li>
          <li>publikowania ośmieszających materiałów,</li>
          <li>celowego wykluczania lub poniżania.</li>
        </ul>
        <p>
          Personel reaguje możliwie wcześnie, zatrzymuje niebezpieczne zachowanie i oddziela
          działania ochronne od późniejszego wyjaśniania sytuacji.
        </p>
      </section>

      <section>
        <h2>8. Urządzenia i Internet</h2>
        <p>Jeżeli Pozytywka udostępnia dzieciom urządzenia lub dostęp do sieci:</p>
        <ul>
          <li>dostęp jest związany z celem zajęć,</li>
          <li>
            personel reaguje na treści pornograficzne, przemocowe, nawołujące do samookaleczeń,
            nienawiści lub inne treści nieadekwatne dla dziecka,
          </li>
          <li>nie pozostawia dziecka z dostępem do nieograniczonych kont administracyjnych,</li>
          <li>nie wymaga logowania do prywatnych kont dziecka bez uzasadnionej potrzeby,</li>
          <li>
            w razie ujawnienia cyberprzemocy lub niebezpiecznego kontaktu wykonuje się procedurę
            interwencji.
          </li>
        </ul>
        <p>
          Jeżeli Pozytywka nie zapewnia uczestnikom urządzeń lub sieci, zasady te stosuje się
          odpowiednio do incydentów ujawnionych podczas zajęć.
        </p>
      </section>

      <section>
        <h2>9. Przyjęcie zgłoszenia o krzywdzeniu</h2>
        <p>Każde zgłoszenie traktuje się poważnie.</p>
        <p>Osoba przyjmująca zgłoszenie:</p>
        <ol>
          <li>zapewnia dziecku bezpieczne warunki rozmowy,</li>
          <li>słucha bez sugerowania odpowiedzi i bez prowadzenia własnego przesłuchania,</li>
          <li>
            nie obiecuje pełnej tajemnicy, wyjaśniając, że informacja może wymagać przekazania
            osobom, które mają zapewnić bezpieczeństwo,
          </li>
          <li>zapisuje fakty możliwie wiernie i neutralnie,</li>
          <li>
            nie kontaktuje osoby podejrzewanej w sposób, który mógłby zwiększyć ryzyko dla dziecka
            lub utrudnić działania właściwych organów,
          </li>
          <li>
            niezwłocznie przekazuje sprawę osobie odpowiedzialnej za interwencję, chyba że konflikt
            interesów wymaga pominięcia tej osoby.
          </li>
        </ol>
      </section>

      <section>
        <h2>10. Interwencja</h2>
        <h3>10.1 Bezpośrednie zagrożenie</h3>
        <p>
          Jeżeli istnieje bezpośrednie zagrożenie życia, zdrowia lub bezpieczeństwa dziecka,
          priorytetem jest niezwłoczne zapewnienie bezpieczeństwa i kontakt z właściwymi służbami
          publicznymi.
        </p>
        <h3>10.2 Podejrzenie przestępstwa</h3>
        <p>
          Jeżeli informacje wskazują na możliwość popełnienia przestępstwa na szkodę małoletniego,
          Pozytywka nie prowadzi dochodzenia na własną rękę. Osoba odpowiedzialna zabezpiecza
          podstawowe informacje i wykonuje wymagane zawiadomienie do właściwego organu.
        </p>
        <h3>10.3 Zagrożenie dobra dziecka bez oczywistego podejrzenia przestępstwa</h3>
        <p>Pozytywka:</p>
        <ul>
          <li>ocenia pilność i potrzebę ochrony,</li>
          <li>kontaktuje rodzica lub opiekuna, jeżeli jest to bezpieczne dla dziecka,</li>
          <li>może ograniczyć kontakt dziecka z osobą stanowiącą ryzyko,</li>
          <li>kieruje sprawę do właściwej instytucji, gdy wymaga tego dobro dziecka lub prawo,</li>
          <li>ustala prosty plan wsparcia i osobę odpowiedzialną za jego wykonanie.</li>
        </ul>
      </section>

      <section>
        <h2>11. Zawiadomienia i odpowiedzialność</h2>
        <p>
          Iwona Pilarz odpowiada za koordynowanie wymaganych zawiadomień dotyczących podejrzenia
          przestępstwa na szkodę małoletniego, potrzeby zawiadomienia sądu opiekuńczego oraz innych
          działań wymaganych przepisami, o ile nie dotyczy jej konflikt interesów.
        </p>
        <p>
          Personel ma obowiązek niezwłocznie przekazać informację, a brak pewności co do
          kwalifikacji prawnej nie jest powodem do zignorowania zagrożenia.
        </p>
      </section>

      <section>
        <h2>12. Plan wsparcia dziecka</h2>
        <p>
          Po ujawnieniu krzywdzenia lub poważnego zdarzenia, w zakresie adekwatnym do roli
          Pozytywki, ustala się:
        </p>
        <ul>
          <li>kto jest bezpiecznym kontaktem dla dziecka,</li>
          <li>jakie zmiany organizacyjne są potrzebne na zajęciach,</li>
          <li>czy należy odseparować określoną osobę,</li>
          <li>jak informowany jest rodzic lub opiekun, jeżeli jest to bezpieczne,</li>
          <li>czy sprawa wymaga udziału właściwej instytucji lub specjalisty,</li>
          <li>kiedy sytuacja zostanie ponownie oceniona.</li>
        </ul>
        <p>Pozytywka nie zastępuje psychoterapii, pomocy społecznej ani organów ścigania.</p>
      </section>

      <section>
        <h2>13. Dokumentowanie incydentów</h2>
        <p>Dokumentacja incydentu zawiera tylko dane niezbędne do:</p>
        <ul>
          <li>ochrony dziecka,</li>
          <li>odtworzenia zgłoszenia i podjętych działań,</li>
          <li>realizacji obowiązków prawnych,</li>
          <li>współpracy z właściwymi instytucjami.</li>
        </ul>
        <p>
          Dokumentacja jest przechowywana oddzielnie od rejestru zapisów, z ograniczonym dostępem.
        </p>
        <p>
          Przyjęta retencja wewnętrznej dokumentacji incydentu: 3 lata od zamknięcia sprawy, chyba
          że postępowanie, obowiązek prawny, zalecenie właściwego organu lub realna potrzeba ochrony
          dziecka uzasadnia dłuższy okres. Zakres przechowywanych informacji podlega okresowej
          minimalizacji.
        </p>
      </section>

      <section>
        <h2>14. Przygotowanie personelu</h2>
        <p>Przed dopuszczeniem do samodzielnej pracy z małoletnimi personel:</p>
        <ul>
          <li>otrzymuje Standardy,</li>
          <li>potwierdza zapoznanie się z nimi,</li>
          <li>zna osobę i kanał zgłaszania obaw,</li>
          <li>zna podstawowe zasady interwencji,</li>
          <li>wie, że nie prowadzi własnego śledztwa,</li>
          <li>
            wie, gdzie przechowuje się dokumentację i czego nie wolno wpisywać do zwykłych notatek
            lub rejestru zapisów.
          </li>
        </ul>
        <p>Potwierdzenie zapoznania przechowuje się w dokumentacji personelu, nie w rejestrze zapisów.</p>
      </section>

      <section>
        <h2>15. Udostępnianie Standardów</h2>
        <ul>
          <li>pełna wersja jest dostępna personelowi i rodzicom lub opiekunom,</li>
          <li>
            skrócona wersja przyjazna małoletnim jest dostępna na stronie{" "}
            <Link href="/standardy-ochrony-maloletnich/dla-dzieci">
              Zasady bezpieczeństwa dla dzieci i młodzieży
            </Link>{" "}
            i powinna być również udostępniana w miejscu prowadzenia zajęć lub innym łatwo dostępnym
            kanale,
          </li>
          <li>
            na prośbę dziecka zasady wyjaśnia się językiem adekwatnym do wieku i możliwości
            rozumienia.
          </li>
        </ul>
      </section>

      <section>
        <h2>16. Przegląd</h2>
        <p>Przegląd obejmuje:</p>
        <ul>
          <li>zgłoszone incydenty i wnioski bez ujawniania zbędnych danych,</li>
          <li>skuteczność kanału zgłoszeń,</li>
          <li>zmiany personelu i działalności,</li>
          <li>adekwatność zasad Internetu i urządzeń,</li>
          <li>aktualność odpowiedzialności i kontaktów,</li>
          <li>zmiany prawa i oficjalnych wytycznych.</li>
        </ul>
        <p>Zmiany są wersjonowane z datą wejścia w życie.</p>
      </section>

      <section>
        <h2>17. Podstawa prawna i źródła</h2>
        <ul>
          <li>
            <a href="https://eli.gov.pl/eli/DU/2024/560/ogl" rel="noreferrer">
              ustawa z 13 maja 2016 r. o przeciwdziałaniu zagrożeniom przestępczością na tle
              seksualnym i ochronie małoletnich, w szczególności art. 21, 22b i 22c
            </a>
            ,
          </li>
          <li>
            <a
              href="https://www.gov.pl/web/sprawiedliwosc/jakie-obowiazki-wynikaja-z-art-21-ustawy-o-ochronie-maloletnich"
              rel="noreferrer"
            >
              wyjaśnienia Ministerstwa Sprawiedliwości dotyczące art. 21
            </a>
            ,
          </li>
          <li>
            <a href="https://www.gov.pl/web/cea/standardy-ochrony-maloletnich" rel="noreferrer">
              materiały Centrum Edukacji Artystycznej
            </a>
            .
          </li>
        </ul>
      </section>
    </DocumentShell>
  );
}
