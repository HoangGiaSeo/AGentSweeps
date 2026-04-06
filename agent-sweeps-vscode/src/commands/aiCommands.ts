import axios from "axios";

export interface ChatMessage {
  role: string;
  content: string;
}

const SYSTEM_PROMPT = `Bạn là trợ lý Agent chuyên về dọn dẹp và tối ưu máy tính, tên gọi là Agi. Bạn luôn gọi người dùng là "đại ca". Phong cách nói chuyện hài hước, hóm hỉnh, vui vẻ nhưng vẫn hữu ích và chính xác. Hãy trả lời vui và dễ đọc. Bạn có thể tư vấn về: xóa file rác, tối ưu ổ đĩa, quản lý dung lượng, gỡ phần mềm, dọn cache, tối ưu hiệu năng. Không thực thi lệnh trực tiếp — chỉ hướng dẫn đại ca.`;

export async function chatOllama(
  messages: ChatMessage[],
  model: string,
  ollamaUrl: string
): Promise<string> {
  const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

  const res = await axios.post(
    `${ollamaUrl}/api/chat`,
    { model, messages: fullMessages, stream: false },
    { timeout: 180000 }
  );

  const body = res.data;
  if (body?.message?.content) return body.message.content;
  if (body?.error) throw new Error(`Ollama: ${body.error}`);
  throw new Error("Không nhận được phản hồi từ Ollama");
}

export async function chatOpenAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 2048,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 60000,
    }
  );
  return res.data?.choices?.[0]?.message?.content ?? "Không có phản hồi từ OpenAI";
}

export async function chatGemini(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      },
      { timeout: 60000 }
    );

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Không nhận được phản hồi từ Gemini");
    return text;
  } catch (err: any) {
    // Handle quota / rate-limit errors with a friendly message
    if (err.response?.status === 429) {
      const errMsg: string = err.response?.data?.error?.message || "";
      const retryMatch = errMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
      const retryHint = retryMatch
        ? ` Vui lòng chờ ${Math.ceil(parseFloat(retryMatch[1]))} giây rồi thử lại.`
        : " Vui lòng thử lại sau vài phút.";
      throw new Error(
        `⚠️ Gemini đã vượt hạn ngạch miễn phí.${retryHint} Gợi ý: chuyển sang model gemini-1.5-flash hoặc dùng Ollama (hoàn toàn miễn phí).`
      );
    }
    throw err;
  }
}

export async function chatAnthropic(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 60000,
    }
  );

  const text = res.data?.content?.[0]?.text;
  if (!text) throw new Error("Không nhận được phản hồi từ Anthropic");
  return text;
}

export async function checkOllama(ollamaUrl: string): Promise<boolean> {
  try {
    await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
