import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import React from "react";

const AGENTS = [
  { name: "Dr. Shalya", role: "Surgical Oncology", color: "#3B82F6", icon: "🔪" },
  { name: "Dr. Chikitsa", role: "Medical Oncology", color: "#8B5CF6", icon: "💊" },
  { name: "Dr. Kirann", role: "Radiation Oncology", color: "#F59E0B", icon: "⚡" },
  { name: "Dr. Shanti", role: "Palliative Care", color: "#10B981", icon: "🤲" },
  { name: "Dr. Chitran", role: "Radiology", color: "#6366F1", icon: "📷" },
  { name: "Dr. Marga", role: "Pathology", color: "#EC4899", icon: "🔬" },
  { name: "Dr. Anuvamsha", role: "Genetics", color: "#14B8A6", icon: "🧬" },
];

// Animated background gradient
const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)
        `,
      }}
    />
  );
};

// Agent card component with pulse animation
const AgentCard: React.FC<{
  agent: typeof AGENTS[0];
  index: number;
  startFrame: number;
  small?: boolean;
}> = ({ agent, index, startFrame, small = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const delay = index * 4;
  const animationFrame = frame - startFrame - delay;
  
  const scale = spring({
    frame: animationFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  const opacity = interpolate(animationFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const pulsePhase = (frame - startFrame - delay) / 15;
  const pulse = Math.sin(pulsePhase) * 0.08 + 1;
  const glowIntensity = (Math.sin(pulsePhase) + 1) / 2;
  
  if (frame < startFrame + delay) return null;
  
  const size = small ? 60 : 80;
  const fontSize = small ? 28 : 36;
  
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: small ? 4 : 8,
        transform: `scale(${scale * pulse})`,
        opacity,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${agent.color}, ${agent.color}88)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          boxShadow: `0 0 ${30 + glowIntensity * 20}px ${agent.color}${Math.floor(66 + glowIntensity * 50).toString(16)}`,
          border: `3px solid ${agent.color}`,
        }}
      >
        {agent.icon}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: small ? 11 : 14, fontWeight: 700, color: "white" }}>
          {agent.name}
        </div>
        <div style={{ fontSize: small ? 9 : 11, color: agent.color }}>
          {agent.role}
        </div>
      </div>
    </div>
  );
};

// Screenshot display with frame and animations
const ScreenshotFrame: React.FC<{
  src: string;
  startFrame: number;
  scale?: number;
}> = ({ src, startFrame, scale = 0.85 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const animationFrame = frame - startFrame;
  
  const springScale = spring({
    frame: animationFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  
  const opacity = interpolate(animationFrame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  // Subtle float animation
  const floatY = Math.sin(frame / 30) * 3;
  
  if (frame < startFrame) return null;
  
  return (
    <div
      style={{
        transform: `scale(${springScale * scale}) translateY(${floatY}px)`,
        opacity,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(99, 102, 241, 0.2)",
        border: "2px solid rgba(255,255,255,0.1)",
      }}
    >
      <Img src={src} style={{ display: "block" }} />
    </div>
  );
};

// Main video component
export const TumorBoardVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isSquare = width === height;
  
  // Scene timings (total 300 frames = 10 seconds)
  // Scene 1: Title (0-50)
  // Scene 2: Problem (50-100)
  // Scene 3: Live UI Demo (100-200)
  // Scene 4: Agents + CTA (200-300)
  
  const titleOpacity = interpolate(frame, [0, 15, 40, 55], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  
  const problemOpacity = interpolate(frame, [50, 65, 90, 105], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const uiDemoOpacity = interpolate(frame, [100, 115, 190, 205], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const ctaOpacity = interpolate(frame, [200, 215, 290, 300], [0, 1, 1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const ctaScale = spring({
    frame: frame - 200,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Screenshot to show based on frame
  const getScreenshot = () => {
    if (isSquare) {
      if (frame < 140) return staticFile("screenshot-hero.png");
      if (frame < 165) return staticFile("screenshot-case.png");
      return staticFile("screenshot-button.png");
    } else {
      if (frame < 150) return staticFile("screenshot-wide-hero.png");
      return staticFile("screenshot-wide-case.png");
    }
  };
  
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Background />
      
      {/* Scene 1: Title */}
      <AbsoluteFill
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
            boxShadow: "0 20px 60px rgba(99, 102, 241, 0.4)",
          }}
        >
          🧠
        </div>
        <h1
          style={{
            fontSize: isSquare ? 56 : 72,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            margin: 0,
            letterSpacing: -2,
          }}
        >
          Virtual Tumor Board
        </h1>
        <p
          style={{
            fontSize: isSquare ? 24 : 28,
            color: "#94A3B8",
            margin: 0,
          }}
        >
          AI-Powered Cancer Care
        </p>
      </AbsoluteFill>
      
      {/* Scene 2: Problem */}
      <AbsoluteFill
        style={{
          opacity: problemOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: isSquare ? 42 : 52,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 800,
          }}
        >
          <span style={{ color: "#F59E0B" }}>Tumor boards</span> save lives.
          <br />
          <span style={{ color: "#94A3B8", fontSize: isSquare ? 36 : 44 }}>
            But most hospitals can't run them.
          </span>
        </div>
      </AbsoluteFill>
      
      {/* Scene 3: Live UI Demo with Screenshot */}
      <AbsoluteFill
        style={{
          opacity: uiDemoOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 30,
        }}
      >
        <div
          style={{
            fontSize: isSquare ? 28 : 36,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
          }}
        >
          <span style={{ color: "#8B5CF6" }}>Real Patient Cases.</span> Real AI Deliberation.
        </div>
        
        <ScreenshotFrame
          src={getScreenshot()}
          startFrame={105}
          scale={isSquare ? 0.48 : 0.52}
        />
        
        {/* Floating labels */}
        {frame > 130 && (
          <div
            style={{
              position: "absolute",
              top: isSquare ? 140 : 100,
              right: isSquare ? 60 : 100,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: interpolate(frame, [130, 145], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            {["KRAS G12C+", "PD-L1 60%", "Stage IIIA"].map((label, i) => (
              <div
                key={label}
                style={{
                  padding: "6px 12px",
                  background: i === 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(99, 102, 241, 0.3)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: i === 0 ? "#10B981" : "#A5B4FC",
                  border: `1px solid ${i === 0 ? "#10B981" : "#6366F1"}44`,
                  transform: `translateX(${spring({ frame: frame - 130 - i * 5, fps, config: { damping: 12 } }) * 0 + (1 - spring({ frame: frame - 130 - i * 5, fps, config: { damping: 12 } })) * 20}px)`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}
      </AbsoluteFill>
      
      {/* Scene 4: Agents + CTA */}
      <AbsoluteFill
        style={{
          opacity: ctaOpacity,
          transform: `scale(${Math.min(ctaScale, 1)})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSquare ? 25 : 30,
          padding: 30,
        }}
      >
        <h2
          style={{
            fontSize: isSquare ? 32 : 40,
            fontWeight: 700,
            color: "white",
            margin: 0,
            textAlign: "center",
          }}
        >
          <span style={{ color: "#8B5CF6" }}>7 AI Specialists</span> Deliberate
        </h2>
        
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: isSquare ? 16 : 30,
            maxWidth: isSquare ? 500 : 800,
          }}
        >
          {AGENTS.map((agent, i) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              index={i}
              startFrame={208}
              small={isSquare}
            />
          ))}
        </div>
        
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 10,
          }}
        >
          {["NCCN", "ESMO", "ASTRO", "+256"].map((guideline, i) => (
            <div
              key={guideline}
              style={{
                padding: "6px 14px",
                background: i === 3 ? "rgba(99, 102, 241, 0.3)" : "rgba(255,255,255,0.1)",
                borderRadius: 6,
                color: i === 3 ? "#A5B4FC" : "#94A3B8",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {guideline}
            </div>
          ))}
        </div>
        
        <div
          style={{
            padding: "16px 32px",
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            borderRadius: 12,
            fontSize: isSquare ? 20 : 24,
            fontWeight: 700,
            color: "white",
            boxShadow: "0 15px 40px rgba(99, 102, 241, 0.4)",
            marginTop: 5,
          }}
        >
          One Click → Consensus
        </div>
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: "#10B981", fontSize: 16 }}>●</span>
          <span style={{ color: "#94A3B8", fontSize: 14 }}>
            Built for Indian Healthcare
          </span>
        </div>
      </AbsoluteFill>
      
      {/* Persistent URL bar */}
      {frame > 40 && (
        <div
          style={{
            position: "absolute",
            bottom: 25,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(frame, [40, 55, 290, 300], [0, 0.6, 0.6, 0], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              padding: "8px 20px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 20,
              color: "#94A3B8",
              fontSize: 12,
            }}
          >
            virtual-tumor-board-production.up.railway.app
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
