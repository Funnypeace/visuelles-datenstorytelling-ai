import React, { useState } from "react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

interface DataChatProps {
  onAsk: (question: string) => Promise<string>;
}

const DataChat: React.FC<DataChatProps> = ({ onAsk }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      const aiReply = await onAsk(input);
      setMessages((msgs) => [...msgs, { sender: "ai", text: aiReply }]);
    } catch (e: any) {
      setMessages((msgs) => [
        ...msgs,
        { sender: "ai", text: "Fehler bei der KI-Antwort: " + (e?.message || e) },
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg max-w-2xl mx-auto mt-6">
      <h3 className="text-xl font-semibold text-primary-700 mb-4 text-center">
        KI-Chat zum aktuellen Dokument
      </h3>
      <div className="h-64 overflow-y-auto border rounded p-3 mb-4 bg-secondary-50">
        {messages.length === 0 ? (
          <div className="text-secondary-500 text-center pt-10">Stelle eine Frage zum hochgeladenen Dokument.</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`mb-2 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-3 py-2 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-secondary-200 text-secondary-800"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="text-primary-700 mt-2">KI denkt …</div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-grow border rounded px-3 py-2"
          placeholder="Frage zur Tabelle stellen …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button
          className="px-4 py-2 rounded bg-primary-600 text-white font-semibold hover:bg-primary-700"
          onClick={handleSend}
          disabled={loading}
        >
          Senden
        </button>
      </div>
    </div>
  );
};

export default DataChat;
