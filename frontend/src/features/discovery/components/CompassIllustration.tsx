import { BookOpen, Puzzle, Sparkles, Users } from 'lucide-react';
export function CompassIllustration() {
  return (
    <div className="compass-scene" aria-hidden="true">
      <span className="scene-orbit orbit-one" />
      <span className="scene-orbit orbit-two" />
      <span className="floating-tile tile-puzzle">
        <Puzzle size={30} />
      </span>
      <span className="floating-tile tile-star">
        <Sparkles size={27} />
      </span>
      <span className="floating-tile tile-book">
        <BookOpen size={23} />
      </span>
      <div className="compass-shadow" />
      <div className="compass-body">
        <div className="compass-ring">
          <span className="north">K</span>
          <span className="south">G</span>
          <span className="east">D</span>
          <span className="west">B</span>
          <div className="compass-lines" />
          <div className="compass-needle" />
          <div className="compass-pin" />
        </div>
      </div>
      <span className="scene-caption">
        <Users size={16} /> Birlikte daha ileriye
      </span>
    </div>
  );
}
