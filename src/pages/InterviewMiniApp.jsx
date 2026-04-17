import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { QUESTION_BANK, UI_TEXT } from "../data/interviewContent";

function getInitialAnswers() {
  return QUESTION_BANK.map((section) =>
    section.questions.map(() => ({
      selected: null,
      otherText: "",
    }))
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 220,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.max(ref.current.scrollHeight, minHeight)}px`;
  }, [value, minHeight]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      rows={6}
      style={{ minHeight: `${minHeight}px`, overflow: "hidden" }}
    />
  );
}

export default function InterviewMiniApp() {
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState("es");
  const current = UI_TEXT[language];

  const localizedSections = useMemo(() => {
    return QUESTION_BANK.map((section) => ({
      title: section.title[language],
      questions: section.questions.map((q) => ({
        prompt: q.prompt[language],
        options: [...q.options[language], current.otherOption],
        correctIndex: q.correctIndex,
        otherIndex: q.options[language].length,
      })),
    }));
  }, [language, current.otherOption]);

  const prefillCandidate = useMemo(
    () => ({
      name: searchParams.get("name") || "",
      position: searchParams.get("position") || "",
      date: new Date().toISOString().split("T")[0],
      phone: searchParams.get("phone") || "",
      email: searchParams.get("email") || "",
      address: searchParams.get("address") || "",
      speaksSpanish: searchParams.get("spanish") === "true",
      speaksEnglish: searchParams.get("english") === "true",
      notes: "",
      summary: "",
    }),
    [searchParams]
  );

  const [candidate, setCandidate] = useState(prefillCandidate);
  const [answers, setAnswers] = useState(getInitialAnswers);
  const [manualPoints, setManualPoints] = useState(0);
  const [openSections, setOpenSections] = useState(
    Array(QUESTION_BANK.length).fill(true)
  );
  const [saveState, setSaveState] = useState({
    loading: false,
    success: "",
    error: "",
    savedId: null,
  });

  const totalQuestions = localizedSections.reduce(
    (sum, section) => sum + section.questions.length,
    0
  );

  const answeredCount = useMemo(() => {
    return answers.flat().filter((entry) => entry.selected !== null).length;
  }, [answers]);

  const autoScore = useMemo(() => {
    return localizedSections.reduce((sum, section, sectionIndex) => {
      return (
        sum +
        section.questions.reduce((inner, question, questionIndex) => {
          const selected = answers[sectionIndex]?.[questionIndex]?.selected;
          if (selected === null) return inner;
          if (selected === question.otherIndex) return inner;
          return inner + (selected === question.correctIndex ? 1 : 0);
        }, 0)
      );
    }, 0);
  }, [answers, localizedSections]);

  const totalScore = autoScore + manualPoints;

  const classification = useMemo(() => {
    if (totalScore >= 35) {
      return {
        dbValue: "JM",
        label: current.jm,
        icon: "🔵",
        bg: "#dbeafe",
        border: "#93c5fd",
        color: "#1d4ed8",
      };
    }
    if (totalScore >= 21) {
      return {
        dbValue: "Top Helper",
        label: current.topHelper,
        icon: "🟡",
        bg: "#fef3c7",
        border: "#fcd34d",
        color: "#92400e",
      };
    }
    return {
      dbValue: "Apprentice",
      label: current.apprentice,
      icon: "🟢",
      bg: "#dcfce7",
      border: "#86efac",
      color: "#166534",
    };
  }, [totalScore, current]);

  const answeredSectionsForPrint = useMemo(() => {
    return localizedSections
      .map((section, sectionIndex) => {
        const answeredQuestions = section.questions
          .map((question, questionIndex) => {
            const entry = answers[sectionIndex]?.[questionIndex];
            if (!entry || entry.selected === null) return null;

            const selectedOption =
              question.options[entry.selected] || current.noSelection;

            let statusText = current.pending;
            if (entry.selected === question.otherIndex) {
              statusText = current.neutral;
            } else if (entry.selected === question.correctIndex) {
              statusText = current.correct;
            } else {
              statusText = current.incorrect;
            }

            return {
              prompt: question.prompt,
              selectedOption,
              statusText,
              isOther: entry.selected === question.otherIndex,
              otherText: entry.otherText || "",
            };
          })
          .filter(Boolean);

        return {
          title: section.title,
          questions: answeredQuestions,
        };
      })
      .filter((section) => section.questions.length > 0);
  }, [answers, current, localizedSections]);

  const handleAnswer = (sectionIndex, questionIndex, optionIndex) => {
    setSaveState((prev) => ({ ...prev, success: "", error: "" }));

    setAnswers((prev) =>
      prev.map((section, sIdx) =>
        sIdx === sectionIndex
          ? section.map((entry, qIdx) =>
              qIdx === questionIndex
                ? {
                    ...entry,
                    selected: optionIndex,
                  }
                : entry
            )
          : section
      )
    );
  };

  const handleOtherText = (sectionIndex, questionIndex, value) => {
    setAnswers((prev) =>
      prev.map((section, sIdx) =>
        sIdx === sectionIndex
          ? section.map((entry, qIdx) =>
              qIdx === questionIndex
                ? {
                    ...entry,
                    otherText: value,
                  }
                : entry
            )
          : section
      )
    );
  };

  const resetAll = () => {
    setCandidate({
      ...prefillCandidate,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      summary: "",
    });
    setAnswers(getInitialAnswers());
    setManualPoints(0);
    setOpenSections(Array(QUESTION_BANK.length).fill(true));
    setSaveState({
      loading: false,
      success: "",
      error: "",
      savedId: null,
    });
  };

  const toggleSection = (index) => {
    setOpenSections((prev) =>
      prev.map((item, i) => (i === index ? !item : item))
    );
  };

  const expandAll = () => {
    setOpenSections(Array(QUESTION_BANK.length).fill(true));
  };

  const collapseAll = () => {
    setOpenSections(Array(QUESTION_BANK.length).fill(false));
  };

  const printToPdf = () => {
    window.print();
  };

  const saveInterview = async () => {
    try {
      setSaveState({
        loading: true,
        success: "",
        error: "",
        savedId: null,
      });

      const snapshot = localizedSections
        .map((section, sectionIndex) => ({
          sectionTitle: section.title,
          sectionOrder: sectionIndex + 1,
          questions: section.questions
            .map((question, questionIndex) => {
              const entry = answers[sectionIndex]?.[questionIndex];
              if (!entry || entry.selected === null) return null;

              const selectedOption = question.options[entry.selected] ?? null;
              const isOther = entry.selected === question.otherIndex;
              const isCorrect = isOther ? null : entry.selected === question.correctIndex;

              return {
                questionOrder: questionIndex + 1,
                questionPrompt: question.prompt,
                selectedOption,
                isCorrect,
                isOther,
                otherText: isOther ? entry.otherText || "" : "",
              };
            })
            .filter(Boolean),
        }))
        .filter((section) => section.questions.length > 0);

      const { data: interviewRow, error: interviewError } = await supabase
        .from("candidate_interviews")
        .insert([
          {
            ui_language: language,
            candidate_name: candidate.name || null,
            position: candidate.position || null,
            interview_date: candidate.date || null,
            phone: candidate.phone || null,
            email: candidate.email || null,
            address: candidate.address || null,
            speaks_spanish: !!candidate.speaksSpanish,
            speaks_english: !!candidate.speaksEnglish,
            auto_score: autoScore,
            manual_points: manualPoints,
            total_score: totalScore,
            classification: classification.dbValue,
            quick_notes: candidate.notes || null,
            final_summary: candidate.summary || null,
            answers_snapshot: snapshot,
          },
        ])
        .select()
        .single();

      if (interviewError) throw interviewError;

      const answerRows = [];

      localizedSections.forEach((section, sectionIndex) => {
        section.questions.forEach((question, questionIndex) => {
          const entry = answers[sectionIndex]?.[questionIndex];
          if (!entry || entry.selected === null) return;

          const isOther = entry.selected === question.otherIndex;
          const isCorrect = isOther ? null : entry.selected === question.correctIndex;

          answerRows.push({
            interview_id: interviewRow.id,
            section_order: sectionIndex + 1,
            question_order: questionIndex + 1,
            section_title: section.title,
            question_prompt: question.prompt,
            selected_option: question.options[entry.selected] ?? null,
            is_correct: isCorrect,
            is_other: isOther,
            other_text: isOther ? entry.otherText || null : null,
          });
        });
      });

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase
          .from("candidate_interview_answers")
          .insert(answerRows);

        if (answersError) throw answersError;
      }

      setSaveState({
        loading: false,
        success: `${current.saved} #${interviewRow.interview_number}`,
        error: "",
        savedId: interviewRow.id,
      });
    } catch (error) {
      console.error(error);
      setSaveState({
        loading: false,
        success: "",
        error: current.saveError,
        savedId: null,
      });
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .interview-app {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 24%),
            radial-gradient(circle at top right, rgba(16,185,129,0.10), transparent 22%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%);
          padding: 24px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #0f172a;
        }

        .interview-shell {
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
        }

        .glass-card {
          background: rgba(255,255,255,0.86);
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 12px 32px rgba(15,23,42,0.08);
        }

        .header-card, .info-card, .section-card, .notes-grid-card {
          padding: 24px;
        }

        .header-top, .toolbar-row, .section-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .title {
          margin: 0;
          font-size: 38px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 10px 0 0 0;
          color: #475569;
          font-size: 16px;
        }

        .top-actions,
        .toolbar-actions,
        .manual-controls,
        .language-checks {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .lang-toggle {
          display: inline-flex;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 14px;
          gap: 4px;
        }

        .lang-btn, .btn, .mini-btn, .toggle-btn, .option-btn {
          transition: 0.18s ease;
          font-weight: 800;
          cursor: pointer;
        }

        .lang-btn {
          border: none;
          padding: 10px 14px;
          border-radius: 10px;
          background: transparent;
          color: #334155;
        }

        .lang-btn.active {
          background: #0f172a;
          color: white;
        }

        .btn {
          border: none;
          border-radius: 14px;
          padding: 11px 15px;
          background: #0f172a;
          color: white;
          font-size: 14px;
        }

        .btn.secondary {
          background: white;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }

        .btn.success {
          background: #16a34a;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 20px;
        }

        .score-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          border-radius: 24px;
          padding: 24px;
        }

        .kicker {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.72;
        }

        .score-big {
          margin-top: 10px;
          font-size: 60px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .score-sub {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
        }

        .progress-track {
          margin-top: 18px;
          width: 100%;
          height: 14px;
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22c55e, #60a5fa);
        }

        .manual-box {
          margin-top: 20px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.10);
        }

        .manual-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .mini-btn {
          border: none;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
        }

        .mini-btn.plus {
          background: #dcfce7;
          color: #166534;
        }

        .mini-btn.minus {
          background: #fee2e2;
          color: #991b1b;
        }

        .classification-card {
          padding: 24px;
          border-radius: 24px;
          border: 1px solid;
        }

        .classification-main {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 30px;
          font-weight: 900;
          line-height: 1.1;
        }

        .thresholds {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .threshold-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          background: rgba(255,255,255,0.48);
          border: 1px solid rgba(255,255,255,0.5);
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 800;
        }

        .section-title {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field.span-3 {
          grid-column: span 3;
        }

        .label {
          font-size: 14px;
          font-weight: 800;
          color: #334155;
        }

        .input, .textarea, .other-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: white;
          padding: 12px 14px;
          font-size: 15px;
          outline: none;
          color: #0f172a;
        }

        .textarea {
          resize: none;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .check-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
          background: #fff;
          font-weight: 800;
          color: #0f172a;
          user-select: none;
        }

        .check-pill.active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .section-stack, .questions-wrap, .thresholds, .options-grid, .notes-grid {
          display: grid;
        }

        .section-stack, .questions-wrap, .thresholds {
          gap: 16px;
        }

        .notes-grid {
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .section-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .pill.blue {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .pill.gray {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .toggle-btn {
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 13px;
        }

        .question-card {
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 18px;
          padding: 16px;
        }

        .question-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .question-text {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.45;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status.pending {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .status.correct {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .status.incorrect {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .status.neutral {
          background: #ede9fe;
          color: #6d28d9;
          border: 1px solid #c4b5fd;
        }

        .options-grid {
          gap: 10px;
          margin-top: 14px;
        }

        .option-btn {
          width: 100%;
          text-align: left;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          color: #0f172a;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px;
        }

        .option-btn.selected {
          border-color: #2563eb;
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
        }

        .option-btn.right {
          border-color: #22c55e;
          background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
          color: #166534;
        }

        .option-btn.wrong {
          border-color: #ef4444;
          background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
          color: #991b1b;
        }

        .option-btn.neutral {
          border-color: #8b5cf6;
          background: linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%);
          color: #6d28d9;
        }

        .other-box {
          margin-top: 12px;
          border: 1px solid #ddd6fe;
          background: #faf5ff;
          border-radius: 14px;
          padding: 12px;
        }

        .other-label {
          font-size: 12px;
          font-weight: 900;
          color: #6d28d9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .save-banner {
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 14px;
        }

        .save-banner.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .save-banner.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .footer-result {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .footer-score {
          font-size: 44px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .print-report {
          display: none;
        }

        .print-section {
          margin-top: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
        }

        .print-question {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .print-question:first-child {
          border-top: none;
          padding-top: 0;
        }

        .print-meta {
          margin-top: 6px;
          color: #334155;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @media (max-width: 1100px) {
          .hero-grid, .notes-grid, .info-grid {
            grid-template-columns: 1fr 1fr;
          }
          .field.span-3 {
            grid-column: span 2;
          }
        }

        @media (max-width: 780px) {
          .interview-app {
            padding: 14px;
          }

          .title {
            font-size: 30px;
          }

          .hero-grid, .notes-grid, .info-grid {
            grid-template-columns: 1fr;
          }

          .field.span-3 {
            grid-column: span 1;
          }

          .score-big {
            font-size: 48px;
          }
        }

        @media print {
          .interview-app {
            background: white !important;
            padding: 0 !important;
          }

          .top-actions,
          .toolbar-actions,
          .toggle-btn,
          .mini-btn,
          .lang-toggle,
          .btn,
          .question-card,
          .toolbar-row,
          .section-stack,
          .notes-grid,
          .footer-result,
          .hero-grid,
          .screen-only {
            display: none !important;
          }

          .glass-card,
          .score-card,
          .classification-card {
            box-shadow: none !important;
            background: white !important;
            backdrop-filter: none !important;
            border: 1px solid #e2e8f0 !important;
          }

          .print-report {
            display: block !important;
          }

          .info-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .field.span-3 {
            grid-column: span 2 !important;
          }
        }
      `}</style>

      <div className="interview-app">
        <div className="interview-shell">
          <div className="glass-card header-card">
            <div className="header-top">
              <div>
                <h1 className="title">{current.title}</h1>
                <p className="subtitle">{current.subtitle}</p>
              </div>

              <div className="top-actions">
                <div className="lang-toggle">
                  <button
                    className={`lang-btn ${language === "es" ? "active" : ""}`}
                    onClick={() => setLanguage("es")}
                  >
                    {current.langEs}
                  </button>
                  <button
                    className={`lang-btn ${language === "en" ? "active" : ""}`}
                    onClick={() => setLanguage("en")}
                  >
                    {current.langEn}
                  </button>
                </div>

                <button className="btn secondary" onClick={resetAll}>
                  {current.reset}
                </button>
                <button
                  className="btn success"
                  onClick={saveInterview}
                  disabled={saveState.loading}
                >
                  {saveState.loading ? current.saving : current.save}
                </button>
                <button className="btn" onClick={printToPdf}>
                  {current.print}
                </button>
              </div>
            </div>

            {(saveState.success || saveState.error) && (
              <div style={{ marginTop: 16 }}>
                {saveState.success ? (
                  <div className="save-banner success">{saveState.success}</div>
                ) : (
                  <div className="save-banner error">{saveState.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="hero-grid screen-only">
            <div className="score-card">
              <div className="kicker">{current.totalScore}</div>
              <div className="score-big">
                {totalScore} / {totalQuestions}
              </div>

              <div className="score-sub">
                <span>
                  {current.autoScore}: <strong>{autoScore}</strong>
                </span>
                <span>
                  {current.manualAdjust}: <strong>{manualPoints}</strong>
                </span>
                <span>
                  {current.answered}: <strong>{answeredCount}</strong> / {totalQuestions}
                </span>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min((Math.max(totalScore, 0) / totalQuestions) * 100, 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="manual-box">
                <div className="manual-row">
                  <div>
                    <div className="kicker">{current.manualLabel}</div>
                    <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900 }}>
                      {manualPoints}
                    </div>
                  </div>

                  <div className="manual-controls">
                    <button
                      className="mini-btn minus"
                      onClick={() => setManualPoints((p) => p - 1)}
                    >
                      − {current.removePoint}
                    </button>
                    <button
                      className="mini-btn plus"
                      onClick={() => setManualPoints((p) => p + 1)}
                    >
                      + {current.addPoint}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="classification-card"
              style={{
                background: classification.bg,
                borderColor: classification.border,
              }}
            >
              <div className="kicker" style={{ color: classification.color }}>
                {current.classification}
              </div>

              <div
                className="classification-main"
                style={{ color: classification.color }}
              >
                <span>{classification.icon}</span>
                <span>{classification.label}</span>
              </div>

              <div className="thresholds">
                <div className="threshold-row">
                  <span>{current.thresholds.apprentice}</span>
                  <span>{current.apprentice}</span>
                </div>
                <div className="threshold-row">
                  <span>{current.thresholds.topHelper}</span>
                  <span>{current.topHelper}</span>
                </div>
                <div className="threshold-row">
                  <span>{current.thresholds.jm}</span>
                  <span>{current.jm}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card info-card">
            <h2 className="section-title" style={{ marginBottom: 18 }}>
              {current.candidateInfo}
            </h2>

            <div className="info-grid">
              <div className="field">
                <label className="label">{current.name}</label>
                <input
                  className="input"
                  value={candidate.name}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="label">{current.position}</label>
                <input
                  className="input"
                  value={candidate.position}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, position: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="label">{current.date}</label>
                <input
                  className="input"
                  type="date"
                  value={candidate.date}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="label">{current.phone}</label>
                <input
                  className="input"
                  value={candidate.phone}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="label">{current.email}</label>
                <input
                  className="input"
                  value={candidate.email}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="field span-3">
                <label className="label">{current.address}</label>
                <input
                  className="input"
                  value={candidate.address}
                  onChange={(e) =>
                    setCandidate((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <div className="field span-3">
                <label className="label">{current.candidateLanguage}</label>
                <div className="language-checks">
                  <label
                    className={`check-pill ${candidate.speaksSpanish ? "active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={candidate.speaksSpanish}
                      onChange={(e) =>
                        setCandidate((prev) => ({
                          ...prev,
                          speaksSpanish: e.target.checked,
                        }))
                      }
                    />
                    <span>{current.spanishCheck}</span>
                  </label>

                  <label
                    className={`check-pill ${candidate.speaksEnglish ? "active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={candidate.speaksEnglish}
                      onChange={(e) =>
                        setCandidate((prev) => ({
                          ...prev,
                          speaksEnglish: e.target.checked,
                        }))
                      }
                    />
                    <span>{current.englishCheck}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card section-card screen-only">
            <div className="toolbar-row">
              <h2 className="section-title">{current.questionBank}</h2>
              <div className="toolbar-actions">
                <button className="btn secondary" onClick={expandAll}>
                  {current.expandAll}
                </button>
                <button className="btn secondary" onClick={collapseAll}>
                  {current.collapseAll}
                </button>
              </div>
            </div>

            <div className="section-stack" style={{ marginTop: 18 }}>
              {localizedSections.map((section, sectionIndex) => {
                const sectionAnswered =
                  answers[sectionIndex]?.filter((entry) => entry.selected !== null)
                    .length || 0;

                const sectionCorrect = section.questions.reduce((sum, q, qIndex) => {
                  const selected = answers[sectionIndex]?.[qIndex]?.selected;
                  if (selected === null) return sum;
                  if (selected === q.otherIndex) return sum;
                  return sum + (selected === q.correctIndex ? 1 : 0);
                }, 0);

                return (
                  <div
                    key={section.title}
                    className="glass-card"
                    style={{ padding: 20, borderRadius: 22 }}
                  >
                    <div className="section-header">
                      <div className="section-header-left">
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                          {section.title}
                        </h3>

                        <span className="pill blue">
                          {sectionCorrect} / {section.questions.length} pts
                        </span>

                        <span className="pill gray">
                          {sectionAnswered} / {section.questions.length} {current.questions}
                        </span>
                      </div>

                      <button
                        className="toggle-btn"
                        onClick={() => toggleSection(sectionIndex)}
                      >
                        {openSections[sectionIndex] ? "−" : "+"}
                      </button>
                    </div>

                    {openSections[sectionIndex] && (
                      <div className="questions-wrap" style={{ marginTop: 18 }}>
                        {section.questions.map((question, questionIndex) => {
                          const entry = answers[sectionIndex]?.[questionIndex];
                          const selected = entry?.selected;
                          const isOtherSelected = selected === question.otherIndex;

                          let statusClass = "pending";
                          let statusText = current.pending;

                          if (selected !== null) {
                            if (isOtherSelected) {
                              statusClass = "neutral";
                              statusText = current.neutral;
                            } else if (selected === question.correctIndex) {
                              statusClass = "correct";
                              statusText = current.correct;
                            } else {
                              statusClass = "incorrect";
                              statusText = current.incorrect;
                            }
                          }

                          return (
                            <div key={question.prompt} className="question-card">
                              <div className="question-head">
                                <div className="question-text">
                                  {questionIndex + 1}. {question.prompt}
                                </div>
                                <div className={`status ${statusClass}`}>{statusText}</div>
                              </div>

                              <div className="options-grid">
                                {question.options.map((option, optionIndex) => {
                                  const selectedThis = selected === optionIndex;
                                  let extraClass = "";

                                  if (selected !== null && selectedThis) {
                                    if (optionIndex === question.otherIndex) {
                                      extraClass = "neutral";
                                    } else if (optionIndex === question.correctIndex) {
                                      extraClass = "right";
                                    } else {
                                      extraClass = "wrong";
                                    }
                                  } else if (selectedThis) {
                                    extraClass = "selected";
                                  }

                                  return (
                                    <button
                                      key={`${question.prompt}-${option}`}
                                      className={`option-btn ${extraClass}`}
                                      onClick={() =>
                                        handleAnswer(sectionIndex, questionIndex, optionIndex)
                                      }
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>

                              {isOtherSelected && (
                                <div className="other-box">
                                  <div className="other-label">{current.otherOption}</div>
                                  <input
                                    className="other-input"
                                    value={entry.otherText}
                                    placeholder={current.otherPlaceholder}
                                    onChange={(e) =>
                                      handleOtherText(
                                        sectionIndex,
                                        questionIndex,
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="notes-grid screen-only">
            <div className="glass-card notes-grid-card">
              <h2 className="section-title" style={{ marginBottom: 16 }}>
                {current.notes}
              </h2>
              <AutoResizeTextarea
                className="textarea"
                value={candidate.notes}
                placeholder={current.notesPlaceholder}
                onChange={(e) =>
                  setCandidate((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <div className="glass-card notes-grid-card">
              <h2 className="section-title" style={{ marginBottom: 16 }}>
                {current.summary}
              </h2>
              <AutoResizeTextarea
                className="textarea"
                value={candidate.summary}
                placeholder={current.summaryPlaceholder}
                onChange={(e) =>
                  setCandidate((prev) => ({ ...prev, summary: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="glass-card footer-result screen-only">
            <div>
              <div className="kicker">{current.finalResult}</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 26,
                  fontWeight: 900,
                  color: classification.color,
                }}
              >
                {classification.icon} {classification.label}
              </div>
            </div>

            <div className="footer-score">
              {totalScore} / {totalQuestions}
            </div>
          </div>

          <div className="print-report">
            <div className="glass-card info-card">
              <h2 className="section-title" style={{ marginBottom: 18 }}>
                {current.candidateInfo}
              </h2>

              <div className="info-grid">
                <div className="field">
                  <div className="label">{current.name}</div>
                  <div className="print-meta">{candidate.name || "—"}</div>
                </div>
                <div className="field">
                  <div className="label">{current.position}</div>
                  <div className="print-meta">{candidate.position || "—"}</div>
                </div>
                <div className="field">
                  <div className="label">{current.date}</div>
                  <div className="print-meta">{candidate.date || "—"}</div>
                </div>
                <div className="field">
                  <div className="label">{current.phone}</div>
                  <div className="print-meta">{candidate.phone || "—"}</div>
                </div>
                <div className="field">
                  <div className="label">{current.email}</div>
                  <div className="print-meta">{candidate.email || "—"}</div>
                </div>
                <div className="field span-3">
                  <div className="label">{current.address}</div>
                  <div className="print-meta">{candidate.address || "—"}</div>
                </div>
                <div className="field span-3">
                  <div className="label">{current.candidateLanguage}</div>
                  <div className="print-meta">
                    {[
                      candidate.speaksSpanish ? current.spanishCheck : null,
                      candidate.speaksEnglish ? current.englishCheck : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card info-card" style={{ marginTop: 20 }}>
              <h2 className="section-title" style={{ marginBottom: 18 }}>
                {current.finalResult}
              </h2>
              <div className="print-meta">
                <strong>{current.totalScore}:</strong> {totalScore} / {totalQuestions}
              </div>
              <div className="print-meta">
                <strong>{current.autoScore}:</strong> {autoScore}
              </div>
              <div className="print-meta">
                <strong>{current.manualAdjust}:</strong> {manualPoints}
              </div>
              <div className="print-meta">
                <strong>{current.classification}:</strong> {classification.icon}{" "}
                {classification.label}
              </div>
            </div>

            {answeredSectionsForPrint.length > 0 && (
              <div className="glass-card info-card" style={{ marginTop: 20 }}>
                <h2 className="section-title">{current.questionBank}</h2>

                {answeredSectionsForPrint.map((section) => (
                  <div key={section.title} className="print-section">
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{section.title}</div>

                    {section.questions.map((question, idx) => (
                      <div key={`${section.title}-${idx}`} className="print-question">
                        <div style={{ fontWeight: 800 }}>
                          {idx + 1}. {question.prompt}
                        </div>
                        <div className="print-meta">
                          <strong>{current.selectedAnswer}:</strong>{" "}
                          {question.selectedOption}
                        </div>
                        <div className="print-meta">
                          <strong>Status:</strong> {question.statusText}
                        </div>
                        {question.isOther && question.otherText && (
                          <div className="print-meta">
                            <strong>{current.otherResponse}:</strong>{" "}
                            {question.otherText}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {(candidate.notes || candidate.summary) && (
              <div className="glass-card info-card" style={{ marginTop: 20 }}>
                <h2 className="section-title" style={{ marginBottom: 18 }}>
                  Notes
                </h2>

                {candidate.notes && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="label">{current.notes}</div>
                    <div className="print-meta">{candidate.notes}</div>
                  </div>
                )}

                {candidate.summary && (
                  <div>
                    <div className="label">{current.summary}</div>
                    <div className="print-meta">{candidate.summary}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}