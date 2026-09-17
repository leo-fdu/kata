import { useMemo, useState } from "react";
import type { BoardPoint, Stone, StoneColor } from "../types/game";
import { GTP_COLUMNS, gtpToPoint, pointKey } from "../types/game";
import type { CandidateMove } from "../engine/client";
import { candidateFill, candidateWinrate } from "../analysis/candidateVisual";

const VIEWBOX_SIZE = 760;
const BOARD_PADDING = 47;
const GRID_SIZE = VIEWBOX_SIZE - BOARD_PADDING * 2;

interface GoBoardProps {
  size: number;
  stones: Stone[];
  nextPlayer: StoneColor;
  lastMove?: Stone;
  occupiedPoints: Set<string>;
  onPlayMove: (point: BoardPoint) => void;
  disabled?: boolean;
  candidates?: CandidateMove[];
  ownership?: number[];
  previewPv?: string[];
  showMoveNumbers?: boolean;
  coordinateStyle?: "gtp" | "sgf" | "none";
}

export function GoBoard({
  size,
  stones,
  nextPlayer,
  lastMove,
  occupiedPoints,
  onPlayMove,
  disabled = false,
  candidates = [],
  ownership,
  previewPv = [],
  showMoveNumbers = false,
  coordinateStyle = "gtp",
}: GoBoardProps) {
  const [hovered, setHovered] = useState<BoardPoint | null>(null);
  const gridLines = useMemo(() => Array.from({ length: size }, (_, index) => index), [size]);
  const cellSize = GRID_SIZE / (size - 1);
  const toCoordinate = (index: number) => BOARD_PADDING + index * cellSize;
  const starIndices = size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];
  const stars = starIndices.flatMap((x) => starIndices.map((y) => [x, y]));
  const previewPoints = previewPv.flatMap((move, index) => {
    try {
      const point = gtpToPoint(move, size);
      return point ? [{ ...point, index }] : [];
    } catch { return []; }
  });

  const pointFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * VIEWBOX_SIZE;
    const y = ((event.clientY - bounds.top) / bounds.height) * VIEWBOX_SIZE;
    const point = {
      x: Math.round((x - BOARD_PADDING) / cellSize),
      y: Math.round((y - BOARD_PADDING) / cellSize),
    };

    if (point.x < 0 || point.y < 0 || point.x >= size || point.y >= size) {
      return null;
    }

    const distance = Math.hypot(x - toCoordinate(point.x), y - toCoordinate(point.y));
    return distance <= cellSize * 0.48 ? point : null;
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    setHovered(disabled ? null : pointFromPointer(event));
  };

  const handleClick = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromPointer(event);
    if (!disabled && point && !occupiedPoints.has(pointKey(point))) {
      onPlayMove(point);
    }
  };

  const canPreview = !disabled && hovered && !occupiedPoints.has(pointKey(hovered));

  return (
    <div className="board-frame">
      <svg
        className={`go-board${disabled ? " go-board--disabled" : ""}`}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="grid"
        aria-label={`${size} by ${size} Go board`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
        onPointerDown={handleClick}
      >
        <defs>
          <filter id="stone-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="2.2" stdDeviation="2.1" floodColor="#1d140a" floodOpacity="0.24" />
          </filter>
          <radialGradient id="black-stone" cx="34%" cy="28%" r="72%">
            <stop offset="0" stopColor="#4e4e4f" />
            <stop offset="0.47" stopColor="#242425" />
            <stop offset="1" stopColor="#0d0d0e" />
          </radialGradient>
          <radialGradient id="white-stone" cx="34%" cy="24%" r="78%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.62" stopColor="#f7f7f5" />
            <stop offset="1" stopColor="#d9d9d5" />
          </radialGradient>
        </defs>

        <rect className="board-surface" x="0" y="0" width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} rx="11" />

        {coordinateStyle !== "none" && <g className="coordinates" aria-hidden="true">
          {gridLines.map((index) => (
            <g key={`coordinate-${index}`}>
              <text x={toCoordinate(index)} y="23" textAnchor="middle">{coordinateStyle === "sgf" ? String.fromCharCode(97 + index) : GTP_COLUMNS[index]}</text>
              <text x={toCoordinate(index)} y="746" textAnchor="middle">{coordinateStyle === "sgf" ? String.fromCharCode(97 + index) : GTP_COLUMNS[index]}</text>
              <text x="20" y={toCoordinate(index) + 4} textAnchor="middle">{coordinateStyle === "sgf" ? index + 1 : size - index}</text>
              <text x="740" y={toCoordinate(index) + 4} textAnchor="middle">{coordinateStyle === "sgf" ? index + 1 : size - index}</text>
            </g>
          ))}
        </g>}

        <g className="grid-lines" aria-hidden="true">
          {gridLines.map((index) => (
            <g key={`line-${index}`}>
              <line x1={BOARD_PADDING} y1={toCoordinate(index)} x2={VIEWBOX_SIZE - BOARD_PADDING} y2={toCoordinate(index)} />
              <line x1={toCoordinate(index)} y1={BOARD_PADDING} x2={toCoordinate(index)} y2={VIEWBOX_SIZE - BOARD_PADDING} />
            </g>
          ))}
        </g>

        <g className="star-points" aria-hidden="true">
          {stars.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={toCoordinate(x)} cy={toCoordinate(y)} r="4.1" />
          ))}
        </g>

        {ownership?.length === size * size && <g className="ownership-heatmap" aria-hidden="true">
          {ownership.map((value, index) => {
            if (Math.abs(value) < 0.12) return null;
            return <rect key={index} x={toCoordinate(index % size) - cellSize * 0.48}
              y={toCoordinate(Math.floor(index / size)) - cellSize * 0.48}
              width={cellSize * 0.96} height={cellSize * 0.96}
              rx={cellSize * 0.2} fill={value > 0 ? "#1c334e" : "#f7f4eb"}
              opacity={Math.min(0.2, Math.abs(value) * 0.2)} />;
          })}
        </g>}

        {canPreview && (
          <circle
            className={`hover-stone hover-stone--${nextPlayer}`}
            cx={toCoordinate(hovered.x)}
            cy={toCoordinate(hovered.y)}
            r={cellSize * 0.445}
          />
        )}

        <g className="stones">
          {stones.map((stone) => {
            const isLastMove = lastMove?.moveNumber === stone.moveNumber;
            return (
              <g key={pointKey(stone)}>
                <circle
                  className={`stone stone--${stone.color}`}
                  cx={toCoordinate(stone.x)}
                  cy={toCoordinate(stone.y)}
                  r={cellSize * 0.46}
                />
                {showMoveNumbers && stone.moveNumber > 0 && <text className={`stone-number stone-number--${stone.color}`}
                  x={toCoordinate(stone.x)} y={toCoordinate(stone.y) + 4.3} textAnchor="middle">{stone.moveNumber}</text>}
                {isLastMove && !showMoveNumbers && (
                  <circle
                    className={`last-move-marker last-move-marker--${stone.color}`}
                    cx={toCoordinate(stone.x)}
                    cy={toCoordinate(stone.y)}
                    r="4.2"
                  />
                )}
              </g>
            );
          })}
        </g>
        <g className="candidate-overlays" aria-hidden="true">
          {candidates.map((candidate, index) => {
            let point: BoardPoint | null;
            try { point = gtpToPoint(candidate.move, size); } catch { return null; }
            if (!point || occupiedPoints.has(pointKey(point))) return null;
            const winrate = candidateWinrate(candidate, nextPlayer);
            const radius = cellSize * 0.45;
            return <g key={candidate.move}>
              {index === 0 && <circle className="candidate-best-outline" cx={toCoordinate(point.x)} cy={toCoordinate(point.y)} r={radius + 2.5} />}
              <circle className={`candidate-circle${index === 0 ? " candidate-circle--best" : ""}`}
                cx={toCoordinate(point.x)} cy={toCoordinate(point.y)} r={radius} fill={candidateFill(winrate)} />
              <text className="candidate-label" x={toCoordinate(point.x)} y={toCoordinate(point.y) + 4}
                textAnchor="middle" fill={winrate > 0.67 ? "#fff" : "#143c2a"}>{Math.round(winrate * 100)}%</text>
            </g>;
          })}
        </g>
        <g className="pv-overlays" aria-hidden="true">
          {previewPoints.map((point) => {
            if (occupiedPoints.has(pointKey(point))) return null;
            const color = point.index % 2 === 0 ? nextPlayer : nextPlayer === "black" ? "white" : "black";
            return <g key={`${point.index}-${point.x}-${point.y}`}>
              <circle className={`pv-stone pv-stone--${color}`} cx={toCoordinate(point.x)} cy={toCoordinate(point.y)} r={cellSize * 0.41} />
              <text className={`pv-number pv-number--${color}`} x={toCoordinate(point.x)} y={toCoordinate(point.y) + 4}
                textAnchor="middle">{point.index + 1}</text>
            </g>;
          })}
        </g>
      </svg>
    </div>
  );
}
