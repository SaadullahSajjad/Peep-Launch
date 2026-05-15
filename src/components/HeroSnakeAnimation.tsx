import { useEffect, useState } from "react";
import car1 from "../assets/images/car1.jpg";
import car2 from "../assets/images/car2.jpg";
import car3 from "../assets/images/car3.jpg";
import car4 from "../assets/images/car4.jpg";
import car5 from "../assets/images/car5.jpg";
import car6 from "../assets/images/car6.jpg";
import car7 from "../assets/images/car7.jpg";
import car8 from "../assets/images/car8.jpg";
import car9 from "../assets/images/car9.jpg";
import car10 from "../assets/images/car10.jpg";
import mech1 from "../assets/images/mechanic1.jpg";
import mech2 from "../assets/images/mechanic2.jpg";
import mech3 from "../assets/images/mechanic3.png";
import mech4 from "../assets/images/mechanic4.jpg";
import mech5 from "../assets/images/mechanic5.jpg";
import mech6 from "../assets/images/mechanic6.jpg";
import mech7 from "../assets/images/mechanic7.jpg";
import mech8 from "../assets/images/mechanic8.jpg";
import mech9 from "../assets/images/mechanic9.jpg";
import mech10 from "../assets/images/mechanic10.jpg";
import "./HeroSnakeAnimation.css";

const CAR_IMGS = [car1, car2, car3, car4, car5, car6, car7, car8, car9, car10];
const MECH_IMGS = [mech1, mech2, mech3, mech4, mech5, mech6, mech7, mech8, mech9, mech10];

type Phase = "idle" | "yellow" | "blue" | "drawing" | "cycling";

// SVG layout constants — circles sit at top of hero, arc dips to mid-hero only
const VB_W = 1200;
const VB_H = 380;
const Y_CX = 120;
const Y_CY = 8;
const B_CX = 1100;
const B_CY = 112;
const R = 23;
// S-curve: exits yellow going DOWN, inflects in the middle, arrives at blue from ABOVE
const PATH = `M ${Y_CX},${Y_CY} C 520,520 920,-100 ${B_CX},${B_CY}`;

export default function HeroSnakeAnimation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawKey, setDrawKey] = useState(0);
  const [carIdx, setCarIdx] = useState(0);
  const [mechIdx, setMechIdx] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cycleTimer: ReturnType<typeof setInterval> | null = null;
    let alive = true;

    const go = () => {
      if (!alive) return;
      if (cycleTimer) {
        clearInterval(cycleTimer);
        cycleTimer = null;
      }

      setPhase("idle");
      setCarIdx(0);
      setMechIdx(0);

      timers.push(setTimeout(() => alive && setPhase("yellow"), 200));
      timers.push(setTimeout(() => alive && setPhase("blue"), 900));
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setPhase("drawing");
          setDrawKey((k) => k + 1);
        }, 1600),
      );
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setPhase("cycling");
          // 10 images, ~1500ms each fits within the remaining ~18s
          cycleTimer = setInterval(() => {
            if (!alive) return;
            setCarIdx((i) => (i + 1) % CAR_IMGS.length);
            setMechIdx((i) => (i + 1) % MECH_IMGS.length);
          }, 1500);
        }, 3000),
      );
    };

    go();
    const loop = setInterval(go, 20000);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      if (cycleTimer) clearInterval(cycleTimer);
      clearInterval(loop);
    };
  }, []);

  const showY = phase !== "idle";
  const showB = phase === "blue" || phase === "drawing" || phase === "cycling";
  const showPath = phase === "drawing" || phase === "cycling";
  const showImgs = phase === "cycling";

  return (
    <div className="hsa-wrap" aria-hidden="true">
      <svg
        className="hsa-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYTop meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="hsa-clip-car">
            <circle cx={Y_CX} cy={Y_CY} r={R} />
          </clipPath>
          <clipPath id="hsa-clip-mech">
            <circle cx={B_CX} cy={B_CY} r={R} />
          </clipPath>
        </defs>

        {/* Snake path — only mounted during draw/cycle so animation restarts each time */}
        {showPath && (
          <path
            key={drawKey}
            className="hsa-path"
            d={PATH}
            fill="none"
            stroke="#1C2028"
            strokeWidth="50"
            strokeLinecap="round"
            pathLength="1"
          />
        )}

        {/* Yellow circle */}
        <circle
          cx={Y_CX}
          cy={Y_CY}
          r={R}
          className={`hsa-dot hsa-dot-yellow${showY ? " visible" : ""}`}
        />

        {/* Blue circle */}
        <circle
          cx={B_CX}
          cy={B_CY}
          r={R}
          className={`hsa-dot hsa-dot-blue${showB ? " visible" : ""}`}
        />

        {/* Car images clipped to yellow circle */}
        {CAR_IMGS.map((src, i) => (
          <image
            key={`car-${i}`}
            href={src}
            x={Y_CX - R}
            y={Y_CY - R}
            width={R * 2}
            height={R * 2}
            clipPath="url(#hsa-clip-car)"
            preserveAspectRatio="xMidYMid slice"
            className={`hsa-img${showImgs && i === carIdx ? " visible" : ""}`}
          />
        ))}

        {/* Mechanic images clipped to blue circle */}
        {MECH_IMGS.map((src, i) => (
          <image
            key={`mech-${i}`}
            href={src}
            x={B_CX - R}
            y={B_CY - R}
            width={R * 2}
            height={R * 2}
            clipPath="url(#hsa-clip-mech)"
            preserveAspectRatio="xMidYMid slice"
            className={`hsa-img${showImgs && i === mechIdx ? " visible" : ""}`}
          />
        ))}
      </svg>
    </div>
  );
}
