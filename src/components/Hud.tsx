import { GAME_DURATION, START_LIVES } from "../game/constants";
import { useGameStore } from "../game/gameStore";
import "./Hud.css";

/*
  Hud ("heads-up display") – tid, liv och poäng ovanpå spelet, plus
  startmenyn och slutskärmen.

  Det här är VANLIG React och HTML, inte three.js! Den ligger bredvid
  <Canvas> i App.tsx och läggs ovanpå med CSS (position: fixed).
  Text och knappar är mycket enklare att göra i HTML än i 3D.

  ── Selectors och omrenderingar ──
  Varje useGameStore((s) => ...) prenumererar på EN sak. Komponenten
  renderas om bara när just det värdet ändras.

  Titta på `secondsLeft`: `elapsed` ändras varje frame (60 ggr/sek), men
  vi avrundar till hela sekunder INNE i selectorn. Resultatet ändras då
  bara en gång per sekund – och HUD:en renderas om bara en gång per
  sekund. Hade vi läst `s.elapsed` direkt hade den renderats om 60 ggr/sek.
*/
export function Hud() {
	const phase = useGameStore((s) => s.phase);
	const lives = useGameStore((s) => s.lives);
	const score = useGameStore((s) => s.score);
	const secondsLeft = useGameStore((s) => Math.ceil(GAME_DURATION - s.elapsed));
	const restart = useGameStore((s) => s.restart);

	return (
		<div className="hud">
			<div className="hud-top">
				{/* "O" för kvarvarande liv, "-" för förlorade */}
				<div className="hud-lives">{"O".repeat(lives) + "-".repeat(START_LIVES - lives)}</div>
				<div className="hud-time">{formatTime(secondsLeft)}</div>
				<div className="hud-score">{score}</div>
			</div>

			{phase === "playing" && (
				<div className="hud-help">
					Styr: WASD / pilar · Skjut: mellanslag · Skjut stenar, plocka kristaller!
				</div>
			)}

			{/*
			  En komponent per fas. && i JSX: rendera bara om villkoret är sant.
			  Startmenyn har ingen knapp – rundan startar när man börjar styra
			  (se Ship.tsx). Menyn försvinner av sig själv när fasen byts till
			  "playing", eftersom HUD:en prenumererar på `phase`.
			*/}
			{phase === "ready" && <StartMenu />}
			{(phase === "won" || phase === "lost") && (
				<EndScreen won={phase === "won"} score={score} onRestart={restart} />
			)}
		</div>
	);
}

function StartMenu() {
	return (
		<div className="hud-overlay hud-start">
			<h1>Space Game</h1>
			<p>Överlev i {GAME_DURATION / 60} minuter!</p>

			<ul className="hud-rules">
				<li>
					<kbd>WASD</kbd> / <kbd>pilar</kbd> – styr
				</li>
				<li>
					<kbd>Mellanslag</kbd> – skjut
				</li>
				<li>
					<span className="hud-rock">Grå stenar</span> – skjut sönder eller väj. Större stenar tål fler
					skott.
				</li>
				<li>
					<span className="hud-crystal">Orange kristaller</span> – flyg in i dem för poäng.
				</li>
			</ul>

			<p className="hud-blink">Börja styra för att starta</p>
		</div>
	);
}

type EndScreenProps = {
	won: boolean;
	score: number;
	onRestart: () => void;
};

function EndScreen({ won, score, onRestart }: EndScreenProps) {
	return (
		<div className="hud-overlay hud-end">
			<h1>{won ? "Du klarade det!" : "Game over"}</h1>
			<p>
				{won ? `Du överlevde i ${GAME_DURATION / 60} minuter.` : "Asteroiderna vann den här gången."}
			</p>
			<p className="hud-end-score">Poäng: {score}</p>
			{/*
			  autoFocus: knappen får fokus direkt, så att Enter startar om.
			  (Mellanslag gör det inte – useKeyboard stoppar det, annars skulle
			  man starta om av misstag om man höll inne skjutknappen.)
			*/}
			<button type="button" onClick={onRestart} autoFocus>
				Spela igen
			</button>
		</div>
	);
}

/** 95 → "1:35". padStart fyller på med nollor: "5" → "05". */
function formatTime(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
