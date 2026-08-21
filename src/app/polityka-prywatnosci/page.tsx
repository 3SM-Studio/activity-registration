import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności | Pracownia Twórcza Pozytywka",
  description: "Informacja o przetwarzaniu danych w systemie zapisów Pracowni Twórczej Pozytywka.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="typeset typeset-legal rounded-3xl border bg-card p-6 shadow-sm sm:p-10 lg:p-12">
        <header className="max-w-3xl border-b pb-8">
          <p className="not-typeset text-sm font-semibold text-primary">Pracownia Twórcza Pozytywka</p>
          <h1 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl">
            Informacja o przetwarzaniu danych osobowych
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Wersja: 20 sierpnia 2026 r. Ta informacja dotyczy danych przekazywanych przez formularz
            zapisów na zajęcia.
          </p>
        </header>

        <div className="max-w-3xl">
          <section className="mt-8">
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem danych jest Pracownia Twórcza Pozytywka. Iwona Pilarz, NIP
              6371975064, REGON 122726372. Adres do kontaktu: ul. Browarna 6a, 32-329 Bolesław.
            </p>
            <p>
              W sprawach dotyczących danych osobowych możesz napisać na{" "}
              <a className="text-primary" href="mailto:pozytywka.boleslaw@gmail.com">
                pozytywka.boleslaw@gmail.com
              </a>{" "}
              lub zadzwonić pod numer 602 753 268.
            </p>
          </section>

          <section>
            <h2>2. Jakie dane przetwarzamy</h2>
            <ul>
              <li>wybrane miasto i rodzaj zajęć,</li>
              <li>imię, nazwisko i datę urodzenia uczestnika,</li>
              <li>imię i nazwisko rodzica lub opiekuna, gdy uczestnik jest małoletni,</li>
              <li>numer telefonu i adres e-mail osoby odpowiedzialnej za zgłoszenie,</li>
              <li>
                dane techniczne i operacyjne niezbędne do obsługi zgłoszenia, takie jak
                identyfikator, czas wysłania, sezon, status i przypisana grupa.
              </li>
            </ul>
            <p>
              Formularz nie służy do zbierania informacji o zdrowiu, diagnozach, lekach, PESEL,
              adresie zamieszkania ani danych do celów marketingowych.
            </p>
          </section>

          <section>
            <h2>3. Cele i podstawy prawne</h2>
            <ul>
              <li>
                przyjęcie zgłoszenia, kontakt oraz uzgodnienie odpowiedniej grupy i warunków
                uczestnictwa, art. 6 ust. 1 lit. b RODO, czyli działania podejmowane na żądanie
                osoby przed zawarciem umowy,
              </li>
              <li>
                dopasowanie uczestnika do odpowiedniej grupy wiekowej, organizacja procesu
                zapisów, zapobieganie oczywistym duplikatom i zapewnienie bezpieczeństwa systemu,
                art. 6 ust. 1 lit. f RODO, czyli prawnie uzasadniony interes administratora,
              </li>
              <li>
                ustalenie, dochodzenie lub obrona roszczeń oraz zapewnienie rozliczalności procesu,
                art. 6 ust. 1 lit. f RODO,
              </li>
              <li>
                realizacja obowiązków wynikających z przepisów prawa, gdy mają zastosowanie, art.
                6 ust. 1 lit. c RODO.
              </li>
            </ul>
            <p>
              Nie podejmujemy wobec uczestników decyzji wyłącznie w sposób zautomatyzowany i nie
              profilujemy ich. Ostatecznego doboru grupy dokonuje człowiek po weryfikacji
              zgłoszenia.
            </p>
          </section>

          <section>
            <h2>4. Odbiorcy i dostawcy</h2>
            <p>
              Dostęp do danych mają wyłącznie upoważnione osoby obsługujące zapisy oraz dostawcy
              usług działający na zlecenie Pozytywki w zakresie niezbędnym do działania systemu:
            </p>
            <ul>
              <li>Vercel, hosting i wykonywanie aplikacji,</li>
              <li>Google, przechowywanie rejestru zgłoszeń w Google Sheets,</li>
              <li>Resend, wysyłka wiadomości transakcyjnych związanych ze zgłoszeniem.</li>
            </ul>
            <p>
              Nie sprzedajemy danych i nie udostępniamy rejestru publicznie. Część dostawców może
              przetwarzać dane poza Europejskim Obszarem Gospodarczym. W takich przypadkach
              stosowane są mechanizmy przewidziane przez RODO, w szczególności odpowiednie umowy
              powierzenia i standardowe klauzule umowne albo inny ważny mechanizm transferowy.
            </p>
          </section>

          <section>
            <h2>5. Jak długo przechowujemy dane</h2>
            <ul>
              <li>
                zgłoszenia anulowane albo odrzucone oraz zgłoszenia, które nie doprowadziły do
                potwierdzenia uczestnictwa: do 12 miesięcy od zamknięcia sprawy,
              </li>
              <li>
                zgłoszenia pozostające na liście rezerwowej: do 3 miesięcy po zakończeniu
                właściwego sezonu,
              </li>
              <li>
                zgłoszenia potwierdzone: do końca roku kalendarzowego przypadającego trzy lata po
                zakończeniu właściwego sezonu, w zakresie potrzebnym do obsługi i obrony roszczeń,
              </li>
              <li>
                jeżeli powstanie spór lub obowiązek prawny wymagający dłuższego przechowania,
                odpowiedni zakres danych może być przechowywany do zakończenia tego celu.
              </li>
            </ul>
            <p>
              Po upływie właściwego okresu dane są usuwane albo anonimizowane, chyba że zostały
              przeniesione do odrębnego procesu prowadzonego na innej podstawie prawnej.
            </p>
          </section>

          <section>
            <h2>6. Twoje prawa</h2>
            <p>
              W zależności od sytuacji możesz żądać dostępu do danych, ich sprostowania, usunięcia,
              ograniczenia przetwarzania lub przeniesienia danych. Możesz także wnieść sprzeciw
              wobec przetwarzania opartego na prawnie uzasadnionym interesie. Realizacja niektórych
              praw może podlegać ograniczeniom wynikającym z przepisów prawa lub konieczności
              ustalenia, obrony albo dochodzenia roszczeń.
            </p>
            <p>Masz również prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.</p>
          </section>

          <section>
            <h2>7. Czy podanie danych jest obowiązkowe</h2>
            <p>
              Podanie danych jest dobrowolne, ale niezbędne do przyjęcia i obsługi zgłoszenia. Bez
              danych uczestnika i danych kontaktowych nie będziemy mogli zweryfikować zgłoszenia,
              dobrać grupy ani skontaktować się w sprawie uczestnictwa.
            </p>
          </section>

          <section>
            <h2>8. Zgłoszenie a miejsce na zajęciach</h2>
            <p>
              Wysłanie formularza jest prośbą o zapis i etapem poprzedzającym uzgodnienie
              uczestnictwa. Nie oznacza automatycznego przyjęcia do konkretnej grupy ani rezerwacji
              miejsca. Pozytywka weryfikuje zgłoszenie i kontaktuje się w celu uzgodnienia właściwej
              grupy i terminu.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
