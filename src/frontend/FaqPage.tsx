import { Accordion, AccordionRow } from '@devmoods/ui';

export function FaqPage() {
  return (
    <div>
      <h2 className="dmk-text-title1 dmk-text-semibold">FAQ</h2>
      <Accordion className="dmk-margin-top-m">
        <AccordionRow title="Why use the Citro 80. app?">
          The official MyCitröen app does, for some reason, not allow you to
          stop charging at a specific percentage. This app lets you do that.
        </AccordionRow>
        <AccordionRow title="How does it work?">
          You sign up with your email and then connect your Citroën EV. When
          you're connected, the app will tell your vehicle to stop charging at
          the percentage you choose.
          <br />
          <br />
          The charger used should not matter.
        </AccordionRow>
        <AccordionRow title="How do I connect?">
          The vehicle connection is handled by{' '}
          <a href="https://enode.com">Enode</a>. During the sign up process you
          will be asked to login with your MyCitröen account.
        </AccordionRow>
        <AccordionRow title="Is my car supported?">
          Yes, it is likely that it will work if your car is a Citroën EV. But
          we have only tested it on a 2024 model ë-C4.
        </AccordionRow>
      </Accordion>
    </div>
  );
}
