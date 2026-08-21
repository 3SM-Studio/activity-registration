import type { Metadata } from "next";
import Link from "next/link";

import { DocumentShell } from "@/components/public/document-shell";

export const metadata: Metadata = {
  title: "Zasady bezpieczeństwa dla dzieci i młodzieży | Pozytywka",
  description:
    "Skrócona, przyjazna dzieciom i młodzieży wersja Standardów Ochrony Małoletnich Pracowni Twórczej Pozytywka.",
};

export default function ChildFriendlyStandardsPage() {
  return (
    <DocumentShell
      eyebrow="Pracownia Twórcza Pozytywka"
      title="Zasady bezpieczeństwa dla dzieci i młodzieży"
      meta="Wersja 1.1 · skrócona wersja Standardów Ochrony Małoletnich · przyjęta i obowiązująca od 21 sierpnia 2026 r."
      backHref="/standardy-ochrony-maloletnich"
      backLabel="Zobacz pełne Standardy"
    >
      <section className="mt-8">
        <h2>Masz prawo czuć się bezpiecznie</h2>
        <p>
          Na zajęciach Pozytywki każda osoba ma prawo do szacunku, bezpieczeństwa i swoich granic.
        </p>
        <p>Nikt nie powinien:</p>
        <ul>
          <li>bić Cię, popychać ani straszyć,</li>
          <li>wyśmiewać, poniżać lub obrażać,</li>
          <li>dotykać Cię w sposób, którego nie chcesz albo który jest nieodpowiedni,</li>
          <li>mówić do Ciebie lub pisać w sposób seksualny,</li>
          <li>prosić Cię o zachowanie niebezpiecznej relacji w tajemnicy,</li>
          <li>zmuszać Cię do przesyłania prywatnych zdjęć,</li>
          <li>proponować Ci alkoholu, nikotyny lub środków odurzających,</li>
          <li>publikować Twojego wizerunku bez odpowiedniej zgody,</li>
          <li>ignorować sytuacji, w której ktoś Cię krzywdzi.</li>
        </ul>
      </section>

      <section>
        <h2>Twoje potrzeby mają znaczenie</h2>
        <p>
          Jeśli masz niepełnosprawność, specjalne potrzeby edukacyjne albo potrzebujesz innego
          sposobu komunikacji, zasady bezpieczeństwa nadal dotyczą Cię w pełni.
        </p>
        <p>
          Możesz poprosić o prostsze wyjaśnienie, więcej czasu, spokojniejsze miejsce rozmowy albo
          inny dostępny sposób przekazania informacji. Osoba dorosła powinna dostosować sposób
          rozmowy i pomocy do Twoich potrzeb, bez zawstydzania i bez ignorowania zgłoszenia.
        </p>
      </section>

      <section>
        <h2>Kontakt fizyczny</h2>
        <p>
          Podczas tańca, teatru lub ćwiczeń czasem potrzebny jest bezpieczny kontakt fizyczny, na
          przykład żeby pokazać ruch albo zapobiec urazowi. Powinien być zawsze związany z
          zajęciami, odpowiedni do sytuacji i z poszanowaniem Twoich granic.
        </p>
        <p>Możesz powiedzieć, że coś jest dla Ciebie niekomfortowe.</p>
      </section>

      <section>
        <h2>Wiadomości i Internet</h2>
        <p>
          Osoba prowadząca zajęcia nie powinna budować z Tobą tajnej prywatnej relacji. Wiadomości
          powinny dotyczyć zajęć i być profesjonalne.
        </p>
        <p>
          Jeżeli ktoś wysyła Ci niepokojące treści, naciska na tajemnicę lub prosi o prywatne
          zdjęcia, powiedz zaufanej osobie dorosłej.
        </p>
      </section>

      <section>
        <h2>Gdy ktoś robi Ci krzywdę</h2>
        <p>Możesz powiedzieć o tym:</p>
        <ul>
          <li>Iwonie Pilarz,</li>
          <li>innemu prowadzącemu, któremu ufasz,</li>
          <li>rodzicowi lub opiekunowi,</li>
          <li>innej zaufanej osobie dorosłej.</li>
        </ul>
        <p>
          Do Iwony Pilarz możesz też napisać na{" "}
          <a href="mailto:pozytywka.boleslaw@gmail.com">pozytywka.boleslaw@gmail.com</a> albo
          zadzwonić pod numer <a href="tel:+48602753268">602 753 268</a>.
        </p>
        <p>
          Możesz powiedzieć to własnymi słowami. Nie musisz znać nazwy tego, co się wydarzyło, ani
          mieć dowodów, żeby poprosić o pomoc.
        </p>
        <p>
          Jeżeli zgłoszenie dotyczy osoby, której zwykle zgłasza się problemy, powiedz innej
          zaufanej osobie dorosłej lub właściwej instytucji.
        </p>
      </section>

      <section>
        <h2>Co zrobi Pozytywka</h2>
        <p>Gdy dowiemy się, że możesz być w niebezpieczeństwie:</p>
        <ol>
          <li>najpierw zadbamy o Twoje bezpieczeństwo,</li>
          <li>wysłuchamy Cię bez obwiniania,</li>
          <li>nie będziemy wymagać, żebyś samodzielnie rozwiązał lub udowodnił problem,</li>
          <li>przekażemy informację tylko osobom, które muszą pomóc,</li>
          <li>
            jeżeli sytuacja tego wymaga, skontaktujemy się z odpowiednią instytucją publiczną,
          </li>
          <li>ustalimy, co trzeba zmienić, żebyś mógł lub mogła czuć się bezpiecznie.</li>
        </ol>
      </section>

      <section>
        <h2>Ważne</h2>
        <p>
          To, że zgłaszasz coś niepokojącego, nie oznacza, że robisz komuś problem. Mówienie o
          sytuacji, która Cię martwi, jest właściwe.
        </p>
        <p>
          Pełna i skrócona wersja Standardów są również udostępniane w widocznym miejscu w lokalu
          Pozytywki.
        </p>
        <p className="not-typeset mt-5 rounded-2xl border border-border bg-muted/45 p-4 text-sm leading-6">
          <Link
            className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
            href="/standardy-ochrony-maloletnich"
          >
            Pełne Standardy Ochrony Małoletnich
          </Link>{" "}
          są dostępne na tej stronie.
        </p>
      </section>
    </DocumentShell>
  );
}
