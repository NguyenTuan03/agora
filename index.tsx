/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import AgoraRTC from "agora-rtc-sdk-ng";
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";

const APP_ID = "8a10c44e471b4d7fb98739edd4c9fe88";
const TOKEN = null;

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

function App() {
  const [inCall, setInCall] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [remoteUser, setRemoteUser] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [someoneJoined, setSomeoneJoined] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null });

  // ⭐ THÊM REF để track xem đã play chưa
  const localVideoPlaying = useRef(false);
  const remoteVideoPlaying = useRef(false);

  const toggleMic = async () => {
    const track = localTracksRef.current.audioTrack;
    if (track) {
      await track.setEnabled(!micEnabled);
      setMicEnabled(!micEnabled);
    }
  };

  const toggleCam = async () => {
    const track = localTracksRef.current.videoTrack;
    if (track) {
      await track.setEnabled(!camEnabled);
      setCamEnabled(!camEnabled);
    }
  };

  // Auto-join từ URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoJoin = params.get("channel");
    if (autoJoin) {
      setChannelName(autoJoin);
      joinChannel(autoJoin);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    const onUserJoined = (user) => {
      console.log("👤 User joined:", user.uid);
      setParticipantCount(1 + client.remoteUsers.length);
      setSomeoneJoined(String(user.uid));
      setTimeout(() => setSomeoneJoined(null), 2500);
    };

    const onUserLeft = (user) => {
      console.log("👋 User left:", user.uid);
      setParticipantCount(1 + client.remoteUsers.length);
      if (remoteUser?.uid === user.uid) {
        setRemoteUser(null);
        setHasRemoteVideo(false);
        remoteVideoPlaying.current = false; // ⭐ Reset flag
        if (remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = "";
        }
      }
    };

    const onUserPublished = async (user, mediaType) => {
      console.log("📢 User published:", user.uid, mediaType);
      await client.subscribe(user, mediaType);

      if (mediaType === "video") {
        // ⭐ CHỈ set remoteUser nếu chưa có hoặc khác user
        if (!remoteUser || remoteUser.uid !== user.uid) {
          setRemoteUser(user);
          setHasRemoteVideo(true);
        }
      }
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
      setParticipantCount(1 + client.remoteUsers.length);
    };

    const onUserUnpublished = (user, mediaType) => {
      console.log("📴 User unpublished:", user.uid, mediaType);
      if (mediaType === "video" && user.uid === remoteUser?.uid) {
        setRemoteUser(null);
        setHasRemoteVideo(false);
        remoteVideoPlaying.current = false; // ⭐ Reset flag
        if (remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = "";
        }
      }
      setParticipantCount(1 + client.remoteUsers.length);
    };

    client.on("user-joined", onUserJoined);
    client.on("user-left", onUserLeft);
    client.on("user-published", onUserPublished);
    client.on("user-unpublished", onUserUnpublished);

    return () => {
      client.off("user-joined", onUserJoined);
      client.off("user-left", onUserLeft);
      client.off("user-published", onUserPublished);
      client.off("user-unpublished", onUserUnpublished);
    };
  }, [remoteUser]);

  // ⭐ Play LOCAL video
  useEffect(() => {
    if (
      !inCall ||
      !localTracksRef.current.videoTrack ||
      !localVideoRef.current
    ) {
      return;
    }

    // ⭐ Kiểm tra flag thay vì DOM
    if (localVideoPlaying.current) {
      console.log("⚠️ Local video already playing (via flag), skipping...");
      return;
    }

    console.log("🎥 Playing local video...");
    const videoTrack = localTracksRef.current.videoTrack;

    try {
      // ⭐ BỎ innerHTML = "" để tránh xóa video đang play
      // localVideoRef.current.innerHTML = "";
      videoTrack.play(localVideoRef.current);
      localVideoPlaying.current = true; // ⭐ Set flag

      setTimeout(() => {
        const el = localVideoRef.current?.querySelector("video");
        console.log("✅ Local video element:", el);
        if (el) {
          el.muted = true;
          el.autoplay = true;
          el.playsInline = true;
          // ⭐ Force play
          el.play().catch((err) => console.error("Play error:", err));

          // ⭐ Debug: Listen for video events
          el.addEventListener("loadeddata", () => {
            console.log("🎬 Local video loadeddata:", {
              readyState: el.readyState,
              videoWidth: el.videoWidth,
              videoHeight: el.videoHeight,
            });
          });
          el.addEventListener("canplay", () => {
            console.log("▶️ Local video canplay");
          });
          el.addEventListener("playing", () => {
            console.log("✅ Local video is playing!");
          });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Error playing local video:", error);
    }
  }, [inCall]);

  // ⭐ Play REMOTE video
  useEffect(() => {
    if (!remoteUser || !hasRemoteVideo || !remoteVideoRef.current) {
      return;
    }

    // ⭐ Kiểm tra flag thay vì DOM
    if (remoteVideoPlaying.current) {
      console.log("⚠️ Remote video already playing (via flag), skipping...");
      return;
    }

    console.log("🎥 Playing remote video...");

    try {
      // ⭐ BỎ innerHTML = "" để tránh xóa video đang play
      // remoteVideoRef.current.innerHTML = "";
      remoteUser.videoTrack?.play(remoteVideoRef.current);
      remoteVideoPlaying.current = true; // ⭐ Set flag

      setTimeout(() => {
        const el = remoteVideoRef.current?.querySelector("video");
        console.log("✅ Remote video element:", el);
        if (el) {
          el.play().catch((err) => console.error("Remote play error:", err));

          // ⭐ Debug: Listen for video events
          el.addEventListener("loadeddata", () => {
            console.log("🎬 Remote video loadeddata:", {
              readyState: el.readyState,
              videoWidth: el.videoWidth,
              videoHeight: el.videoHeight,
            });
          });
          el.addEventListener("canplay", () => {
            console.log("▶️ Remote video canplay");
          });
          el.addEventListener("playing", () => {
            console.log("✅ Remote video is playing!");
          });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Error playing remote video:", error);
    }
  }, [remoteUser, hasRemoteVideo]);

  const joinChannel = async (name: string) => {
    if (!name) {
      alert("Please enter a channel name.");
      return;
    }

    if (
      client.connectionState === "CONNECTED" ||
      client.connectionState === "CONNECTING"
    ) {
      console.log("Already connected, leaving first...");
      await leaveChannel();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      AgoraRTC.setLogLevel(1);

      const cams = await AgoraRTC.getCameras();
      const mics = await AgoraRTC.getMicrophones();
      console.log("📷 Cameras:", cams.length, "🎤 Mics:", mics.length);

      await client.join(APP_ID, name, TOKEN, null);
      console.log("✅ Joined channel:", name);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: mics?.[0]?.deviceId,
      });
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: cams?.[0]?.deviceId,
        encoderConfig: "720p_2",
      });

      localTracksRef.current.audioTrack = audioTrack;
      localTracksRef.current.videoTrack = videoTrack;

      await client.publish([audioTrack, videoTrack]);
      console.log("✅ Published tracks");

      setInCall(true);
      setChannelName(name);
    } catch (e: any) {
      console.error("❌ JOIN/PUBLISH FAILED:", e?.message || e);
      alert(`Lỗi: ${e?.message || e}`);
    }
  };

  const leaveChannel = async () => {
    try {
      localTracksRef.current.audioTrack?.stop();
      localTracksRef.current.audioTrack?.close();
      localTracksRef.current.videoTrack?.stop();
      localTracksRef.current.videoTrack?.close();

      await client.leave();

      // ⭐ Reset flags
      localVideoPlaying.current = false;
      remoteVideoPlaying.current = false;

      setInCall(false);
      setRemoteUser(null);
      setHasRemoteVideo(false);
      setChannelName("");

      console.log("✅ Left channel");
    } catch (error) {
      console.error("❌ Failed to leave channel", error);
    }
  };

  const createAndJoin = () => {
    const newChannelName = Math.random().toString(36).substring(7);
    setChannelName(newChannelName);
    joinChannel(newChannelName);
  };

  const Lobby = () => (
    <div className="lobby">
      <h1>Agora Video Chat</h1>
      {APP_ID === "8a10c44e471b4d7fb98739edd4c9fe88" && (
        <div className="app-id-warning">
          <strong>Reminder:</strong> Please update APP_ID with your Agora App ID
        </div>
      )}
      <div className="input-group">
        <label htmlFor="channel">Channel Name</label>
        <input
          id="channel"
          type="text"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          placeholder="Enter channel name..."
          onKeyDown={(e) => {
            if (e.key === "Enter") joinChannel(channelName);
          }}
        />
      </div>
      <div className="button-group">
        <button className="create-btn" onClick={createAndJoin}>
          Create & Join
        </button>
        <button className="join-btn" onClick={() => joinChannel(channelName)}>
          Join
        </button>
      </div>
    </div>
  );

  const VideoCall = () => (
    <div className="call-container">
      <div className="channel-info">
        Channel: {channelName} · {participantCount} online
      </div>
      <div className="videos-wrapper">
        <div id="remote-video" className="video-player" ref={remoteVideoRef}>
          {!hasRemoteVideo && <p>Waiting for other users to join...</p>}
        </div>
        <div
          id="local-video"
          className="video-player"
          ref={localVideoRef}
        ></div>
      </div>
      <div className="controls">
        <button onClick={toggleMic}>{micEnabled ? "Mute" : "Unmute"}</button>
        <button onClick={toggleCam}>
          {camEnabled ? "Camera Off" : "Camera On"}
        </button>
        <button onClick={leaveChannel}>Leave</button>
      </div>
      {someoneJoined && (
        <div className="join-toast">User {someoneJoined} joined</div>
      )}
    </div>
  );

  return inCall ? <VideoCall /> : <Lobby />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
