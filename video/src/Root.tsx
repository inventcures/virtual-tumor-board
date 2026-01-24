import { Composition } from "remotion";
import { TumorBoardVideo } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TumorBoardDemo"
        component={TumorBoardVideo}
        durationInFrames={300} // 10 seconds at 30fps
        fps={30}
        width={1080}
        height={1080} // Square for social media
      />
      <Composition
        id="TumorBoardDemoWide"
        component={TumorBoardVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080} // 16:9 for YouTube
      />
    </>
  );
};
