import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  LiveEnvironmentData,
  MapLayer,
  ResolvedIndiaSector,
  computeVulnerabilityIndex,
  resolveIndianAqi,
  resolveUsAqi,
} from '../utils/uhiModel';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AreaAiChatboxProps {
  selectedSector: ResolvedIndiaSector;
  allSectors: ResolvedIndiaSector[];
  activeLayer: MapLayer;
  envBySectorId: Record<string, LiveEnvironmentData | undefined>;
  liveEnvironment: LiveEnvironmentData | null;
  isDark: boolean;
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/°C/g, ' degrees Celsius')
    .replace(/ΔT/g, 'temperature anomaly')
    .replace(/µg\/m³/g, 'micrograms per cubic meter')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderFormattedInline(text: string): React.ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedChatText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={idx} className="h-0.5" />;
        }
        const headingMatch = line.match(/^#{1,4}\s+(.*)$/);
        if (headingMatch) {
          return (
            <p key={idx} className="font-semibold tracking-tight pt-0.5">
              {renderFormattedInline(headingMatch[1])}
            </p>
          );
        }
        const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5">
              <span aria-hidden="true" className="select-none opacity-75">
                •
              </span>
              <span className="flex-1">{renderFormattedInline(bulletMatch[1])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

export function AreaAiChatbox({
  selectedSector,
  allSectors,
  activeLayer,
  envBySectorId,
  liveEnvironment,
  isDark,
}: AreaAiChatboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask or speak a question about any Indian city, park, or industrial zone on the map—surface temperatures, canopy cooling, Open-Meteo weather/AQI, or heat mitigation strategies.',
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice Assistant state (Speech-to-Text & Text-to-Speech)
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sendMessageRef = useRef<(textOverride?: string) => Promise<void>>(
    async () => {}
  );

  const speechInputSupported = getSpeechRecognitionCtor() !== null;
  const speechOutputSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isSending]);

  const stopSpeaking = useCallback(() => {
    if (speechOutputSupported) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, [speechOutputSupported]);

  const speakText = useCallback(
    (text: string, messageId: string) => {
      if (!speechOutputSupported) {
        setVoiceNotice('Speech synthesis is unavailable in this browser.');
        return;
      }
      const spoken = cleanTextForSpeech(text);
      if (!spoken) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      utterance.onstart = () => setSpeakingMessageId(messageId);
      utterance.onend = () =>
        setSpeakingMessageId((curr) => (curr === messageId ? null : curr));
      utterance.onerror = () =>
        setSpeakingMessageId((curr) => (curr === messageId ? null : curr));

      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [speechOutputSupported]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const sendMessage = async (textOverride?: string) => {
    const prompt = (textOverride ?? input).trim();
    if (!prompt || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setIsSending(true);
    setError(null);
    setVoiceNotice(null);

    const vuln = computeVulnerabilityIndex(selectedSector);
    const activeEnv = liveEnvironment ?? envBySectorId[selectedSector.id] ?? null;
    const selectedIndianAqi = resolveIndianAqi(activeEnv);
    const selectedUsAqi = resolveUsAqi(activeEnv);
    const sectorPayload = {
      code: selectedSector.code,
      label: selectedSector.label,
      city: selectedSector.city,
      state: selectedSector.state,
      tier: selectedSector.tier,
      region: selectedSector.subRegion,
      category: selectedSector.category,
      avgSurfaceTempC: selectedSector.avgSurfaceTempC,
      tempAnomalyC: selectedSector.tempAnomalyC,
      greenCanopyPct: selectedSector.greenCanopyPct,
      waterBodyPct: selectedSector.waterBodyPct,
      imperviousPct: selectedSector.imperviousPct,
      albedoIndex: selectedSector.albedoIndex,
      ndviMean: selectedSector.ndviMean,
      vulnerability: vuln,
      naqi: selectedIndianAqi?.aqi ?? null,
      naqiCategory: selectedIndianAqi?.category ?? null,
      usAqi: selectedUsAqi,
      pm25: selectedIndianAqi?.pm25 ?? null,
      coolingMitigationNote: selectedSector.coolingMitigationNote,
      formattedAddress: selectedSector.formattedAddress,
    };

    const allSectorsSummary = allSectors.map((s) => {
      const env = envBySectorId[s.id];
      const aqiInfo = resolveIndianAqi(env);
      return {
        code: s.code,
        label: s.label,
        city: s.city,
        state: s.state,
        tier: s.tier,
        region: s.subRegion,
        category: s.category,
        avgSurfaceTempC: s.avgSurfaceTempC,
        tempAnomalyC: s.tempAnomalyC,
        greenCanopyPct: s.greenCanopyPct,
        imperviousPct: s.imperviousPct,
        albedoIndex: s.albedoIndex,
        naqi: aqiInfo?.aqi ?? null,
        naqiCategory: aqiInfo?.category ?? null,
        usAqi: resolveUsAqi(env),
        pm25: aqiInfo?.pm25 ?? null,
        liveAirTempC: env?.weather?.available
          ? env.weather.temperatureC ?? null
          : null,
      };
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
          selectedSector: sectorPayload,
          liveEnvironment: activeEnv,
          allSectorsSummary,
          activeLayer,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.reply) {
        throw new Error(json?.error || `AI request failed (${res.status}).`);
      }

      const replyId = `assistant-${Date.now()}`;
      const replyText = String(json.reply);
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: 'assistant',
          content: replyText,
        },
      ]);

      if (autoSpeak && speechOutputSupported) {
        speakText(replyText, replyId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach AI climate analyst.'
      );
    } finally {
      setIsSending(false);
    }
  };

  sendMessageRef.current = sendMessage;

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceNotice(
        'Microphone speech recognition is not supported in this browser. Use typed queries or Voice Briefing playback.'
      );
      return;
    }

    stopSpeaking();
    setVoiceNotice(null);

    try {
      const recognition = new Ctor();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      let latestTranscript = '';

      recognition.onresult = (event) => {
        let interim = '';
        let finalText = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          const t = item[0]?.transcript ?? '';
          if (item.isFinal) {
            finalText += t;
          } else {
            interim += t;
          }
        }
        latestTranscript = (finalText || interim).trim();
        setInterimTranscript(latestTranscript);
        if (finalText.trim()) {
          setIsListening(false);
          setInterimTranscript('');
          void sendMessageRef.current(finalText.trim());
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setInterimTranscript('');
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone permission was denied. Allow mic access to speak.');
        } else if (event.error !== 'aborted') {
          setVoiceNotice('Could not capture voice input. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Unable to start microphone voice recognition.');
    }
  };

  const handleVoiceBriefing = () => {
    const activeEnv = liveEnvironment ?? envBySectorId[selectedSector.id] ?? null;
    const indianAqi = resolveIndianAqi(activeEnv);
    const usAqi = resolveUsAqi(activeEnv);
    const vuln = computeVulnerabilityIndex(selectedSector);
    const airTemp =
      activeEnv?.weather.available && activeEnv.weather.temperatureC != null
        ? `${activeEnv.weather.temperatureC.toFixed(1)}°C ambient air`
        : 'live weather pending';
    const rhText =
      activeEnv?.weather.relativeHumidity != null
        ? `, ${activeEnv.weather.relativeHumidity}% relative humidity`
        : '';
    const aqiText = indianAqi
      ? `Indian NAQI is ${indianAqi.aqi} (${indianAqi.category.replace(/\s*air quality$/i, '')})${
          usAqi != null ? ` with Open-Meteo US AQI ${usAqi}` : ''
        }`
      : 'Air quality telemetry is loading';

    const briefing =
      `${selectedSector.label} in ${selectedSector.city}, ${selectedSector.state} (${selectedSector.tier}): ` +
      `Peak surface temperature is ${selectedSector.avgSurfaceTempC.toFixed(1)}°C (${
        selectedSector.tempAnomalyC >= 0 ? '+' : ''
      }${selectedSector.tempAnomalyC.toFixed(1)}°C vs baseline), with ${selectedSector.greenCanopyPct.toFixed(
        0
      )}% canopy cover and ${vuln.score}/100 (${vuln.tier}) heat vulnerability. ` +
      `Current Open-Meteo status: ${airTemp}${rhText}. ${aqiText}.`;

    const briefId = `brief-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: briefId,
        role: 'assistant',
        content: briefing,
      },
    ]);
    speakText(briefing, briefId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  const quickPrompts = [
    `Why does ${selectedSector.label} have ${selectedSector.tempAnomalyC >= 0 ? '+' : ''}${selectedSector.tempAnomalyC.toFixed(1)}°C anomaly?`,
    `Compare ${selectedSector.city} with India's coolest park zone`,
    `Best cooling interventions for ${selectedSector.label}`,
  ];

  return (
    <div
      className={
        isOpen
          ? 'fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2'
          : 'absolute bottom-6 right-2.5 sm:right-3 z-30 flex flex-col items-end'
      }
    >
      {isOpen && (
        <section
          aria-label="THERMA Area & Voice Climate Analyst"
          className={`w-[min(380px,calc(100vw-2rem))] h-[min(460px,calc(100vh-5.5rem))] rounded-[11px] border flex flex-col overflow-hidden backdrop-blur-xl transition-colors ${
            isDark
              ? 'bg-[#0a0a0a]/96 border-[#facc15]/35 text-[#fef9c3] shadow-[0_16px_40px_rgba(0,0,0,0.85)]'
              : 'bg-white/96 border-[#d2d2d7] text-[#1d1d1f] shadow-[0_16px_40px_rgba(0,0,0,0.18)]'
          }`}
        >
          {/* Chat Header with Voice Controls */}
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/25'
                : 'bg-[#f5f5f7] border-[#d2d2d7]/80'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                  }`}
                  aria-hidden="true"
                />
                <h2 className="text-xs font-semibold tracking-tight truncate">
                  THERMA · Voice &amp; Area Analyst
                </h2>
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                Focused: {selectedSector.label} ({selectedSector.city})
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleVoiceBriefing}
                aria-label="Speak live briefing for selected area"
                title="Speak live microclimate & AQI briefing"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-[8px] border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-black border-[#facc15]/35 text-[#facc15] hover:bg-[#1f1f1f]'
                    : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                <AudioLines className="w-3 h-3" aria-hidden="true" />
                <span>Brief</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (autoSpeak) stopSpeaking();
                  setAutoSpeak((prev) => !prev);
                }}
                aria-pressed={autoSpeak}
                aria-label={
                  autoSpeak
                    ? 'Disable automatic voice replies'
                    : 'Enable automatic voice replies'
                }
                title={autoSpeak ? 'Voice replies ON' : 'Voice replies OFF'}
                className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                  autoSpeak
                    ? isDark
                      ? 'bg-[#facc15]/20 text-[#facc15]'
                      : 'bg-[#0071e3]/12 text-[#0071e3]'
                    : isDark
                      ? 'text-[#d4c46a] hover:bg-[#1f1f1f]'
                      : 'text-[#86868b] hover:bg-[#e8e8ed]'
                }`}
              >
                {autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                aria-label="Close AI chatbox"
                className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                  isDark
                    ? 'text-[#d4c46a] hover:text-[#facc15] hover:bg-[#1f1f1f]'
                    : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Voice Listening / Notice Strip */}
          {(isListening || voiceNotice || speakingMessageId) && (
            <div
              className={`px-3.5 py-1.5 border-b text-[11px] flex items-center justify-between gap-2 shrink-0 ${
                isDark
                  ? 'bg-[#1a1400] border-[#facc15]/25 text-[#facc15]'
                  : 'bg-[#0071e3]/[0.06] border-[#d2d2d7]/70 text-[#1d1d1f]'
              }`}
            >
              <span className="truncate">
                {isListening
                  ? interimTranscript
                    ? `Listening: "${interimTranscript}"`
                    : 'Listening... speak your question about any India area'
                  : speakingMessageId
                    ? 'Speaking THERMA response...'
                    : voiceNotice}
              </span>
              {speakingMessageId && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 cursor-pointer ${
                    isDark
                      ? 'border-[#facc15]/40 text-[#facc15] hover:bg-[#facc15]/15'
                      : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <Square className="w-2.5 h-2.5" aria-hidden="true" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 text-xs"
          >
            {messages.map((msg) => {
              const isSpeakingThis = speakingMessageId === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] px-3 py-2 rounded-[11px] leading-relaxed ${
                      msg.role === 'user'
                        ? isDark
                          ? 'bg-[#facc15] text-black font-medium whitespace-pre-wrap'
                          : 'bg-[#0071e3] text-white whitespace-pre-wrap'
                        : isDark
                          ? 'bg-[#141414] border border-[#facc15]/20 text-[#fef9c3]'
                          : 'bg-[#f5f5f7] text-[#1d1d1f]'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="space-y-1.5">
                        <FormattedChatText content={msg.content} />
                        {speechOutputSupported && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                isSpeakingThis
                                  ? stopSpeaking()
                                  : speakText(msg.content, msg.id)
                              }
                              aria-label={
                                isSpeakingThis
                                  ? 'Stop reading response'
                                  : 'Read response aloud'
                              }
                              className={`inline-flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                                isDark
                                  ? 'text-[#d4c46a] hover:text-[#facc15]'
                                  : 'text-[#86868b] hover:text-[#0071e3]'
                              }`}
                            >
                              {isSpeakingThis ? (
                                <>
                                  <Square className="w-2.5 h-2.5" aria-hidden="true" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" aria-hidden="true" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div
                  className={`px-3 py-2 rounded-[11px] text-xs ${
                    isDark
                      ? 'bg-[#141414] border border-[#facc15]/20 text-[#d4c46a]'
                      : 'bg-[#f5f5f7] text-[#86868b]'
                  }`}
                >
                  Analyzing India microclimate data...
                </div>
              </div>
            )}

            {error && (
              <div
                className={`px-3 py-2 rounded-[8px] text-[11px] border ${
                  isDark
                    ? 'bg-[#1a1400] border-[#facc15]/50 text-[#facc15]'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {error}
              </div>
            )}
          </div>

          {/* Quick Suggested Prompts */}
          <div
            className={`px-3 py-2 border-t flex gap-1.5 overflow-x-auto shrink-0 ${
              isDark ? 'border-[#facc15]/15' : 'border-[#d2d2d7]/60'
            }`}
          >
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(qp)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-[8px] border whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-[#141414] border-[#facc15]/30 text-[#facc15] hover:bg-[#1f1f1f]'
                    : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Form with Voice Microphone Button */}
          <form
            onSubmit={handleSubmit}
            className={`p-2.5 border-t flex items-center gap-1.5 shrink-0 ${
              isDark
                ? 'bg-[#0a0a0a] border-[#facc15]/25'
                : 'bg-white border-[#d2d2d7]/80'
            }`}
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isSending}
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? 'Stop voice microphone'
                  : speechInputSupported
                    ? 'Speak question using microphone'
                    : 'Voice microphone'
              }
              title={
                speechInputSupported
                  ? isListening
                    ? 'Stop listening'
                    : 'Ask by voice'
                  : 'Voice input requires Chrome/Edge/Safari SpeechRecognition'
              }
              className={`p-2 rounded-[8px] border transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                isListening
                  ? 'bg-red-600 border-red-600 text-white animate-pulse'
                  : isDark
                    ? 'bg-[#141414] border-[#facc15]/30 text-[#facc15] hover:bg-[#1f1f1f]'
                    : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Mic className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            <label htmlFor="ai-area-chat-input" className="sr-only">
              Ask or speak about any area on the India map
            </label>
            <input
              id="ai-area-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask or speak about ${selectedSector.label}...`}
              disabled={isSending}
              className={`flex-1 min-w-0 px-3 py-1.5 text-xs rounded-[8px] border focus:outline-none focus:ring-2 transition-colors ${
                isDark
                  ? 'bg-[#141414] border-[#facc15]/30 text-[#fef9c3] placeholder:text-[#d4c46a]/70 focus:border-[#facc15] focus:ring-[#facc15]/25'
                  : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:border-[#0071e3] focus:ring-[#0071e3]/20'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send question to THERMA"
              className={`p-2 rounded-[8px] transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                isDark
                  ? 'bg-[#facc15] text-black hover:bg-[#eab308]'
                  : 'bg-[#0071e3] text-white hover:bg-[#005bb5]'
              }`}
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Minimize THERMA chatbox' : 'Open THERMA chatbox'}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-[11px] text-xs font-semibold border transition-all cursor-pointer shadow-[0_6px_20px_rgba(0,0,0,0.18)] ${
          isDark
            ? 'bg-[#facc15] border-[#facc15] text-black hover:bg-[#eab308]'
            : 'bg-[#0071e3] border-[#0071e3] text-white hover:bg-[#005bb5]'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="sm:hidden">{isOpen ? 'Hide' : 'THERMA'}</span>
        <span className="hidden sm:inline">{isOpen ? 'Hide THERMA' : 'Ask THERMA'}</span>
      </button>
    </div>
  );
}
