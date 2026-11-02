import { useEffect, useRef } from "react";

/*
  useKeyboard – en egen React-hook som håller koll på vilka tangenter som
  är nedtryckta just nu.

  ── Varför inte bara reagera på "keydown"? ──
  Webbläsaren skickar ett keydown-event när man trycker ner en tangent, och
  sen (efter en paus) upprepade events om man håller inne den – som när man
  skriver "aaaaaa". Det är ryckigt och värdelöst för ett spel.

  I stället sparar vi ett TILLSTÅND: "vänster är nedtryckt: true/false".
  keydown sätter true, keyup sätter false. Spel-loopen (useFrame) kan sen
  varje frame fråga "är vänster nedtryckt just nu?" och flytta skeppet
  mjukt så länge svaret är ja.

  ── Varför useRef och inte useState? ──
  Samma princip som tidigare: om vi använde useState skulle hela komponenten
  renderas om varje gång man trycker eller släpper en tangent. Spel-loopen
  läser ändå värdet själv varje frame, så React behöver inte veta något.
*/

/** Spelets handlingar. */
export type Controls = {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
	fire: boolean;
};

/** Utgångsläget: ingen tangent nedtryckt. */
function noKeysPressed(): Controls {
	return { left: false, right: false, up: false, down: false, fire: false };
}

/*
  Vilken tangent som styr vilken handling.

  Vi använder `event.code` (den FYSISKA tangenten, t.ex. "KeyA") i stället
  för `event.key` (tecknet, t.ex. "a"). Då funkar WASD likadant oavsett om
  man har svenskt, amerikanskt eller franskt tangentbord, och oavsett om
  Caps Lock är på ("A" vs "a").
*/
const KEY_MAP: Record<string, keyof Controls> = {
	ArrowLeft: "left",
	KeyA: "left",
	ArrowRight: "right",
	KeyD: "right",
	ArrowUp: "up",
	KeyW: "up",
	ArrowDown: "down",
	KeyS: "down",
	Space: "fire",
};

export function useKeyboard() {
	const controls = useRef<Controls>(noKeysPressed());

	/*
	  useEffect med tom beroende-lista [] körs EN gång när komponenten
	  monteras. Funktionen vi returnerar ("cleanup") körs när komponenten
	  tas bort. Det är viktigt att ta bort event-lyssnarna då – annars
	  ligger de kvar och läcker minne.

	  (I utvecklingsläge kör React StrictMode effekten två gånger för att
	  hjälpa oss hitta just sådana glömda cleanups.)
	*/
	useEffect(() => {
		function setKey(event: KeyboardEvent, pressed: boolean) {
			const action = KEY_MAP[event.code];
			if (!action) return; // En tangent vi inte bryr oss om

			// Förhindra webbläsarens standardbeteende, t.ex. att piltangenter
			// scrollar sidan, eller att mellanslag "klickar" på en knapp som
			// har fokus (som Spela igen-knappen i HUD:en).
			event.preventDefault();
			controls.current[action] = pressed;
		}

		const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
		const onKeyUp = (event: KeyboardEvent) => setKey(event, false);

		/*
		  Klassisk spel-bugg: håll inne vänster, klicka utanför fönstret
		  (eller Cmd+Tab) och släpp tangenten. Fönstret får då aldrig något
		  keyup, och skeppet fortsätter åka åt vänster för evigt!
		  Lösning: släpp alla tangenter när fönstret tappar fokus ("blur").
		*/
		const onBlur = () => {
			controls.current = noKeysPressed();
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
		};
	}, []);

	// Vi returnerar själva ref-objektet. Den som använder hooken läser
	// `controls.current.left` osv. – alltid det senaste värdet.
	return controls;
}
