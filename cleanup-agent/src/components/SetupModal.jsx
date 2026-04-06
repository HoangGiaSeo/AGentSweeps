import { useState, useEffect, useCallback } from "react";
import { checkOllamaSetup, ensureOllamaRunning, startModelPull, completeSetup } from "../api";
import "../styles/setup.css";

const DEFAULT_MODEL = "gemma3:4b";

export default function SetupModal({ onComplete }) {
  const [phase, setPhase] = useState("checking"); // checking | not_installed | starting | pulling | ready | error
  const [models, setModels] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [pullStarted, setPullStarted] = useState(false);

  const doCheck = useCallback(async () => {
    try {
      const status = await checkOllamaSetup();
      if (!status.ollama_installed) {
        setPhase("not_installed");
        return;
      }
      if (status.models && status.models.length > 0) {
        setModels(status.models);
        setPhase("ready");
        return;
      }
      if (status.ollama_running) {
        setPhase("pulling");
      } else {
        setPhase("starting");
      }
    } catch (e) {
      setPhase("not_installed");
    }
  }, []);

  useEffect(() => {
    doCheck();
  }, [doCheck]);

  // Poll every 5s while pulling
  useEffect(() => {
    if (phase !== "pulling") return;
    const id = setInterval(async () => {
      try {
        const status = await checkOllamaSetup();
        if (status.models && status.models.length > 0) {
          setModels(status.models);
          setPhase("ready");
          clearInterval(id);
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(id);
  }, [phase]);

  const handleStartOllama = async () => {
    setPhase("starting");
    try {
      await ensureOllamaRunning();
      setPhase("pulling");
    } catch (e) {
      setErrorMsg("Không thể khởi động Ollama: " + e);
      setPhase("error");
    }
  };

  const handlePullModel = async () => {
    if (pullStarted) return;
    setPullStarted(true);
    try {
      await startModelPull(DEFAULT_MODEL);
      setPhase("pulling");
    } catch (e) {
      setErrorMsg("Không thể tải model: " + e);
      setPhase("error");
    }
  };

  const handleSkip = async () => {
    await completeSetup().catch(() => {});
    onComplete();
  };

  const handleFinish = async () => {
    await completeSetup().catch(() => {});
    onComplete();
  };

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <div className="setup-header">
          <img src="/fish-icon.png" alt="AGent WinWin" className="setup-logo" />
          <h2>Chào mừng đến với AGent WinWin</h2>
          <p className="setup-subtitle">Thiết lập trợ lý AI cục bộ</p>
        </div>

        <div className="setup-body">
          {phase === "checking" && (
            <div className="setup-step">
              <div className="setup-spinner" />
              <p>Đang kiểm tra hệ thống…</p>
            </div>
          )}

          {phase === "not_installed" && (
            <div className="setup-step">
              <div className="setup-icon">⚠️</div>
              <h3>Ollama chưa được cài đặt</h3>
              <p>
                Để dùng AI cục bộ (miễn phí, riêng tư), bạn cần cài Ollama trước.
                Sau khi cài xong, khởi động lại ứng dụng.
              </p>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="setup-btn setup-btn-primary"
              >
                Tải Ollama tại ollama.com
              </a>
              <p className="setup-note">
                Hoặc bỏ qua nếu bạn muốn dùng API Key (OpenAI / Gemini / Claude).
              </p>
            </div>
          )}

          {phase === "starting" && (
            <div className="setup-step">
              <div className="setup-spinner" />
              <h3>Đang khởi động Ollama…</h3>
              <p>Đệ đang bật engine AI cục bộ cho đại ca, chờ xíu nhé!</p>
            </div>
          )}

          {phase === "pulling" && (
            <div className="setup-step">
              {!pullStarted ? (
                <>
                  <div className="setup-icon">🤖</div>
                  <h3>Tải Model AI ({DEFAULT_MODEL})</h3>
                  <p>
                    Ollama đã sẵn sàng. Đệ cần tải model <strong>{DEFAULT_MODEL}</strong> (~2.5 GB)
                    để trợ lý AI hoạt động. Chỉ tải một lần!
                  </p>
                  <button className="setup-btn setup-btn-primary" onClick={handlePullModel}>
                    Tải model ngay
                  </button>
                </>
              ) : (
                <>
                  <div className="setup-spinner" />
                  <h3>Đang tải {DEFAULT_MODEL}…</h3>
                  <p>
                    Model đang tải xuống nền (~2.5 GB). Đại ca có thể dùng ứng dụng bình thường,
                    trợ lý AI sẽ tự kích hoạt sau khi tải xong.
                  </p>
                  <p className="setup-note">Ứng dụng tự kiểm tra mỗi 5 giây.</p>
                </>
              )}
            </div>
          )}

          {phase === "ready" && (
            <div className="setup-step">
              <div className="setup-icon success">✅</div>
              <h3>AI đã sẵn sàng!</h3>
              <p>
                Model <strong>{models[0]}</strong>
                {models.length > 1 ? ` (+${models.length - 1} model khác)` : ""} đã được cài đặt.
                Trợ lý AI cục bộ hoạt động hoàn toàn trên máy của đại ca.
              </p>
              <button className="setup-btn setup-btn-primary" onClick={handleFinish}>
                Bắt đầu dùng ngay
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="setup-step">
              <div className="setup-icon">❌</div>
              <h3>Có lỗi xảy ra</h3>
              <p className="setup-error">{errorMsg}</p>
              <p>Bỏ qua để dùng API Key hoặc thử lại sau.</p>
            </div>
          )}
        </div>

        <div className="setup-footer">
          {phase !== "ready" && (
            <button className="setup-btn setup-btn-ghost" onClick={handleSkip}>
              Bỏ qua — Tôi dùng API Key
            </button>
          )}
          {phase === "not_installed" && (
            <button className="setup-btn setup-btn-secondary" onClick={handleStartOllama}>
              Ollama đã cài, thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
