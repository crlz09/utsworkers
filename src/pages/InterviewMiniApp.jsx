import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Shuffle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  GripVertical,
  EyeOff,
  RotateCcw,
  Eye,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";
import { QUESTION_BANK, UI_TEXT } from "../data/interviewContent";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";

function PageStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }

      @media print {
        .uts-topbar {
          display: none !important;
        }
      }
    `}</style>
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

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickOneRandom(array) {
  if (!array.length) return null;
  return shuffleArray(array)[0];
}

function buildBalancedInterviewSet(questionBank) {
  return questionBank.map((section) => {
    const basic = section.questions.filter((q) => q.difficulty === "basic");
    const intermediate = section.questions.filter(
      (q) => q.difficulty === "intermediate"
    );
    const advanced = section.questions.filter((q) => q.difficulty === "advanced");

    const selected = [
      pickOneRandom(basic),
      pickOneRandom(intermediate),
      pickOneRandom(advanced),
    ].filter(Boolean);

    if (selected.length < 3) {
      const selectedIds = new Set(selected.map((q) => q.id));
      const remaining = section.questions.filter((q) => !selectedIds.has(q.id));
      const filler = shuffleArray(remaining).slice(0, 3 - selected.length);
      selected.push(...filler);
    }

    return {
      ...section,
      activeQuestions: shuffleArray(selected),
    };
  });
}

function buildInitialAnswersMap(activeSections) {
  const map = {};
  activeSections.forEach((section) => {
    map[section.id] = {};
    section.activeQuestions.forEach((question) => {
      map[section.id][question.id] = {
        selected: null,
        otherText: "",
      };
    });
  });
  return map;
}

function buildDefaultLayout(sectionIds) {
  return sectionIds.map((sectionId) => ({
    sectionId,
    hidden: false,
  }));
}

function applyPresetToLayout(currentLayout, presetOrder, hiddenIds = []) {
  const currentMap = new Map(currentLayout.map((item) => [item.sectionId, item]));
  const hiddenSet = new Set(hiddenIds);

  const orderedExisting = presetOrder
    .filter((id) => currentMap.has(id))
    .map((id) => ({
      sectionId: id,
      hidden: hiddenSet.has(id),
    }));

  const remaining = currentLayout
    .filter((item) => !presetOrder.includes(item.sectionId))
    .map((item) => ({
      sectionId: item.sectionId,
      hidden: hiddenSet.has(item.sectionId),
    }));

  return [...orderedExisting, ...remaining];
}

function moveItem(array, fromIndex, toIndex) {
  const copy = [...array];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export default function InterviewMiniApp() {
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState("es");
  const [radarOpen, setRadarOpen] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [layoutPresetUsed, setLayoutPresetUsed] = useState("default");
  const current = UI_TEXT[language];

  const text = useMemo(() => {
    if (language === "es") {
      return {
        presetsLabel: "Presets",
        presetDefault: "Default",
        presetHelper: "Helper / Apprentice",
        presetIndustrial: "Industrial / Field",
        presetControls: "Controls / Automation",
        presetJourneyman: "Journeyman / General",
        organizerTitle: "Organizador de entrevista",
        organizerHelp:
          "Reordena categorías con drag & drop, oculta las que no usarás y aplica presets para acelerar la llamada.",
        resetOrder: "Reset order",
        restoreAll: "Restore all",
        hiddenSections: "Secciones omitidas en esta entrevista",
        hiddenSectionsEmpty: "No hay secciones ocultas.",
        hideSection: "Ocultar",
        restoreSection: "Restaurar",
        dragHint: "Arrastra para reordenar",
        showChart: "Mostrar gráfico",
        hideChart: "Ocultar gráfico",
        strengthMap: "Mapa de fortalezas",
        strongestArea: "Punto más fuerte",
        weakestArea: "Área a reforzar",
        quickRead: "Lectura rápida",
        summary: "Resumen",
        openChartHint:
          "Abre el gráfico para ver el desempeño del candidato por categoría.",
        chartHelp:
          "Este gráfico muestra en qué secciones respondió mejor el candidato. Mientras más lejos del centro, mejor fue su desempeño.",
      };
    }

    return {
      presetsLabel: "Presets",
      presetDefault: "Default",
      presetHelper: "Helper / Apprentice",
      presetIndustrial: "Industrial / Field",
      presetControls: "Controls / Automation",
      presetJourneyman: "Journeyman / General",
      organizerTitle: "Interview organizer",
      organizerHelp:
        "Reorder categories with drag & drop, hide the ones you will not use, and apply presets to move faster during the call.",
      resetOrder: "Reset order",
      restoreAll: "Restore all",
      hiddenSections: "Skipped sections for this interview",
      hiddenSectionsEmpty: "There are no hidden sections.",
      hideSection: "Hide",
      restoreSection: "Restore",
      dragHint: "Drag to reorder",
      showChart: "Show chart",
      hideChart: "Hide chart",
      strengthMap: "Strength map",
      strongestArea: "Strongest area",
      weakestArea: "Needs reinforcement",
      quickRead: "Quick read",
      summary: "Summary",
      openChartHint:
        "Open the chart to view the candidate's performance by category.",
      chartHelp:
        "This chart shows where the candidate performed better. The farther from the center, the stronger the performance.",
    };
  }, [language]);

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

  const allSectionIds = useMemo(() => QUESTION_BANK.map((s) => s.id), []);
  const initialSetRef = useRef(buildBalancedInterviewSet(QUESTION_BANK));

  const [candidate, setCandidate] = useState(prefillCandidate);
  const [activeSections, setActiveSections] = useState(initialSetRef.current);
  const [answersMap, setAnswersMap] = useState(() =>
    buildInitialAnswersMap(initialSetRef.current)
  );
  const [sectionLayout, setSectionLayout] = useState(() =>
    buildDefaultLayout(allSectionIds)
  );
  const [manualPoints, setManualPoints] = useState(0);
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(allSectionIds.map((id) => [id, true]))
  );
  const [saveState, setSaveState] = useState({
    loading: false,
    success: "",
    error: "",
    savedId: null,
  });

  const sectionById = useMemo(() => {
    const map = {};
    activeSections.forEach((section) => {
      map[section.id] = section;
    });
    return map;
  }, [activeSections]);

  const orderedSections = useMemo(() => {
    return sectionLayout
      .map((item) => ({
        ...item,
        section: sectionById[item.sectionId],
      }))
      .filter((item) => item.section);
  }, [sectionLayout, sectionById]);

  const visibleOrderedSections = useMemo(
    () => orderedSections.filter((item) => !item.hidden),
    [orderedSections]
  );

  const hiddenOrderedSections = useMemo(
    () => orderedSections.filter((item) => item.hidden),
    [orderedSections]
  );

  const localizedSections = useMemo(() => {
    return visibleOrderedSections.map(({ section }) => ({
      id: section.id,
      title: section.title[language],
      activeQuestions: section.activeQuestions.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        prompt: q.prompt[language],
        options: [...q.options[language], current.otherOption],
        correctIndex: q.correctIndex,
        otherIndex: q.options[language].length,
      })),
    }));
  }, [visibleOrderedSections, language, current.otherOption]);

  const totalQuestions = localizedSections.reduce(
    (sum, section) => sum + section.activeQuestions.length,
    0
  );

  const answeredCount = useMemo(() => {
    let count = 0;
    localizedSections.forEach((section) => {
      section.activeQuestions.forEach((question) => {
        const entry = answersMap?.[section.id]?.[question.id];
        if (entry?.selected !== null && entry?.selected !== undefined) {
          count += 1;
        }
      });
    });
    return count;
  }, [localizedSections, answersMap]);

  const autoScore = useMemo(() => {
    let sum = 0;
    localizedSections.forEach((section) => {
      section.activeQuestions.forEach((question) => {
        const selected = answersMap?.[section.id]?.[question.id]?.selected;
        if (selected === null || selected === undefined) return;
        if (selected === question.otherIndex) return;
        if (selected === question.correctIndex) sum += 1;
      });
    });
    return sum;
  }, [localizedSections, answersMap]);

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

  const radarData = useMemo(() => {
    return localizedSections.map((section) => {
      const correct = section.activeQuestions.reduce((sum, question) => {
        const selected = answersMap?.[section.id]?.[question.id]?.selected;
        if (selected === null || selected === undefined) return sum;
        if (selected === question.otherIndex) return sum;
        return sum + (selected === question.correctIndex ? 1 : 0);
      }, 0);

      const total = section.activeQuestions.length || 1;
      const percent = Math.round((correct / total) * 100);

      let shortLabel = section.title;
      if (shortLabel.includes(".")) {
        shortLabel = shortLabel.split(".").slice(1).join(".").trim();
      }
      if (shortLabel.length > 18) {
        shortLabel = shortLabel.slice(0, 18) + "…";
      }

      return {
        section: shortLabel,
        fullSection: section.title,
        score: correct,
        total,
        percent,
      };
    });
  }, [localizedSections, answersMap]);

  const strongestSection = useMemo(() => {
    if (!radarData.length) return null;
    return [...radarData].sort((a, b) => b.percent - a.percent)[0];
  }, [radarData]);

  const weakestSection = useMemo(() => {
    if (!radarData.length) return null;
    return [...radarData].sort((a, b) => a.percent - b.percent)[0];
  }, [radarData]);

  const answeredSectionsForPrint = useMemo(() => {
    return localizedSections
      .map((section) => {
        const answeredQuestions = section.activeQuestions
          .map((question) => {
            const entry = answersMap?.[section.id]?.[question.id];
            if (!entry || entry.selected === null || entry.selected === undefined) {
              return null;
            }

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
  }, [answersMap, current, localizedSections]);

  const presetOrders = useMemo(
    () => ({
      default: [
        "wire-cable-pulling",
        "motors-controllers",
        "plc-controls",
        "troubleshooting",
        "conduit-rigid-emt",
        "conduit-types",
        "blueprints",
        "ladder-schematics",
        "branch-circuits",
        "switchgear",
        "cable-tray",
        "voltage-levels",
        "instrumentation",
        "nec",
        "electrical-math",
      ],
      helper: [
        "wire-cable-pulling",
        "conduit-rigid-emt",
        "conduit-types",
        "cable-tray",
        "branch-circuits",
        "blueprints",
        "troubleshooting",
        "motors-controllers",
        "switchgear",
        "nec",
        "electrical-math",
        "plc-controls",
        "ladder-schematics",
        "instrumentation",
        "voltage-levels",
      ],
      industrial: [
        "troubleshooting",
        "motors-controllers",
        "conduit-rigid-emt",
        "wire-cable-pulling",
        "switchgear",
        "cable-tray",
        "branch-circuits",
        "blueprints",
        "nec",
        "conduit-types",
        "plc-controls",
        "ladder-schematics",
        "instrumentation",
        "voltage-levels",
        "electrical-math",
      ],
      controls: [
        "plc-controls",
        "ladder-schematics",
        "troubleshooting",
        "motors-controllers",
        "instrumentation",
        "blueprints",
        "nec",
        "electrical-math",
        "switchgear",
        "branch-circuits",
        "wire-cable-pulling",
        "conduit-rigid-emt",
        "conduit-types",
        "cable-tray",
        "voltage-levels",
      ],
      journeyman: [
        "troubleshooting",
        "motors-controllers",
        "plc-controls",
        "blueprints",
        "nec",
        "conduit-rigid-emt",
        "wire-cable-pulling",
        "switchgear",
        "branch-circuits",
        "cable-tray",
        "conduit-types",
        "ladder-schematics",
        "instrumentation",
        "voltage-levels",
        "electrical-math",
      ],
    }),
    []
  );

  const applyPreset = (presetKey) => {
    const nextLayout = applyPresetToLayout(
      sectionLayout,
      presetOrders[presetKey] || presetOrders.default
    );
    setSectionLayout(nextLayout);
    setLayoutPresetUsed(presetKey);
    setSaveState((prev) => ({ ...prev, success: "", error: "" }));
  };

  const handleAnswer = (sectionId, questionId, optionIndex) => {
    setSaveState((prev) => ({ ...prev, success: "", error: "" }));

    setAnswersMap((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [questionId]: {
          ...prev[sectionId]?.[questionId],
          selected: optionIndex,
        },
      },
    }));
  };

  const handleOtherText = (sectionId, questionId, value) => {
    setAnswersMap((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [questionId]: {
          ...prev[sectionId]?.[questionId],
          otherText: value,
        },
      },
    }));
  };

  const hideSection = (sectionId) => {
    setSectionLayout((prev) =>
      prev.map((item) =>
        item.sectionId === sectionId ? { ...item, hidden: true } : item
      )
    );
  };

  const restoreSection = (sectionId) => {
    setSectionLayout((prev) =>
      prev.map((item) =>
        item.sectionId === sectionId ? { ...item, hidden: false } : item
      )
    );
  };

  const restoreAllSections = () => {
    setSectionLayout((prev) => prev.map((item) => ({ ...item, hidden: false })));
  };

  const resetOrder = () => {
    setSectionLayout(buildDefaultLayout(allSectionIds));
    setLayoutPresetUsed("default");
  };

  const handleDragStart = (sectionId) => {
    setDraggedSectionId(sectionId);
    setLayoutPresetUsed("custom");
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (targetSectionId) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDraggedSectionId(null);
      return;
    }

    const fromIndex = sectionLayout.findIndex(
      (item) => item.sectionId === draggedSectionId
    );
    const toIndex = sectionLayout.findIndex(
      (item) => item.sectionId === targetSectionId
    );

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedSectionId(null);
      return;
    }

    setSectionLayout((prev) => moveItem(prev, fromIndex, toIndex));
    setDraggedSectionId(null);
  };

  const handleDragEnd = () => {
    setDraggedSectionId(null);
  };

  const regenerateQuestions = () => {
    const confirmed = window.confirm(current.changingQuestionsWarning);
    if (!confirmed) return;

    const nextSet = buildBalancedInterviewSet(QUESTION_BANK);
    setActiveSections(nextSet);
    setAnswersMap(buildInitialAnswersMap(nextSet));
    setManualPoints(0);
    setOpenSections(Object.fromEntries(allSectionIds.map((id) => [id, true])));
    setSaveState({
      loading: false,
      success: "",
      error: "",
      savedId: null,
    });
  };

  const resetAll = () => {
    const nextSet = buildBalancedInterviewSet(QUESTION_BANK);
    setCandidate({
      ...prefillCandidate,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      summary: "",
    });
    setActiveSections(nextSet);
    setAnswersMap(buildInitialAnswersMap(nextSet));
    setSectionLayout(buildDefaultLayout(allSectionIds));
    setManualPoints(0);
    setOpenSections(Object.fromEntries(allSectionIds.map((id) => [id, true])));
    setSaveState({
      loading: false,
      success: "",
      error: "",
      savedId: null,
    });
    setRadarOpen(false);
    setLayoutPresetUsed("default");
  };

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const expandAll = () => {
    const next = {};
    visibleOrderedSections.forEach(({ sectionId }) => {
      next[sectionId] = true;
    });
    setOpenSections((prev) => ({ ...prev, ...next }));
  };

  const collapseAll = () => {
    const next = {};
    visibleOrderedSections.forEach(({ sectionId }) => {
      next[sectionId] = false;
    });
    setOpenSections((prev) => ({ ...prev, ...next }));
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
          sectionId: section.id,
          sectionTitle: section.title,
          sectionOrder: sectionIndex + 1,
          questions: section.activeQuestions
            .map((question, questionIndex) => {
              const entry = answersMap?.[section.id]?.[question.id];
              if (!entry || entry.selected === null || entry.selected === undefined) {
                return null;
              }

              const selectedOption = question.options[entry.selected] ?? null;
              const isOther = entry.selected === question.otherIndex;
              const isCorrect = isOther ? null : entry.selected === question.correctIndex;

              return {
                questionId: question.id,
                difficulty: question.difficulty,
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

      const sectionOrderSnapshot = orderedSections.map((item, index) => ({
        sectionId: item.sectionId,
        sectionTitle: item.section.title[language],
        hidden: item.hidden,
        finalOrder: index + 1,
      }));

      const hiddenSectionsSnapshot = hiddenOrderedSections.map((item) => ({
        sectionId: item.sectionId,
        sectionTitle: item.section.title[language],
      }));

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
            section_order_snapshot: sectionOrderSnapshot,
            hidden_sections_snapshot: hiddenSectionsSnapshot,
            layout_preset_used: layoutPresetUsed,
          },
        ])
        .select()
        .single();

      if (interviewError) throw interviewError;

      const answerRows = [];

      localizedSections.forEach((section, sectionIndex) => {
        section.activeQuestions.forEach((question, questionIndex) => {
          const entry = answersMap?.[section.id]?.[question.id];
          if (!entry || entry.selected === null || entry.selected === undefined) return;

          const isOther = entry.selected === question.otherIndex;
          const isCorrect = isOther ? null : entry.selected === question.correctIndex;

          answerRows.push({
            interview_id: interviewRow.id,
            section_id: section.id,
            question_id: question.id,
            difficulty: question.difficulty,
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

  const difficultyLabel = (difficulty) => {
    if (difficulty === "basic") return current.difficultyBasic;
    if (difficulty === "intermediate") return current.difficultyIntermediate;
    return current.difficultyAdvanced;
  };

  const difficultyBadgeStyle = (difficulty) => {
    if (difficulty === "basic") {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    }
    if (difficulty === "intermediate") {
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
    }
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fca5a5",
    };
  };

  return (
    <>
      <PageStyles />
      <style>{`
        * { box-sizing: border-box; }

        .interview-app {
          min-height: calc(100vh - 78px);
          background:
            radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 24%),
            radial-gradient(circle at top right, rgba(16,185,129,0.10), transparent 22%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%);
          color: #0f172a;
        }

        .interview-shell {
          width: 100%;
          max-width: 1700px;
          margin: 0 auto;
          padding: 24px;
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

        .header-card, .info-card, .section-card, .notes-grid-card, .radar-card, .organizer-card {
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
        .language-checks,
        .organizer-actions,
        .preset-row,
        .hidden-chip-row {
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

        .lang-btn, .btn, .mini-btn, .toggle-btn, .option-btn, .radar-toggle-btn, .preset-btn, .section-action-btn, .hidden-chip-btn {
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

        .btn.shuffle {
          background: #7c3aed;
        }

        .preset-btn, .section-action-btn, .hidden-chip-btn {
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .preset-btn:hover,
        .section-action-btn:hover,
        .hidden-chip-btn:hover,
        .radar-toggle-btn:hover {
          background: #f8fafc;
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

        .mix-banner {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%);
          border: 1px solid #c4b5fd;
          color: #5b21b6;
          display: grid;
          gap: 6px;
        }

        .organizer-grid {
          display: grid;
          gap: 16px;
          margin-top: 16px;
        }

        .organizer-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 14px;
        }

        .section-draggable {
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 16px;
        }

        .section-draggable.dragging {
          opacity: 0.55;
        }

        .section-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .drag-handle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          color: #475569;
          cursor: grab;
          flex-shrink: 0;
        }

        .section-card-title {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.25;
        }

        .section-meta {
          display: flex;
          gap: 8px;
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

        .radar-toggle-btn {
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          border-radius: 14px;
          padding: 11px 15px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .radar-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 20px;
          align-items: stretch;
          margin-top: 18px;
        }

        .radar-chart-shell {
          height: 420px;
          width: 100%;
        }

        .radar-side {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .radar-mini {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 8px;
        }

        .radar-legend-row {
          display: grid;
          gap: 10px;
        }

        .radar-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .radar-label {
          font-weight: 800;
          color: #0f172a;
        }

        .radar-meta {
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .radar-percent {
          font-weight: 900;
          color: #0f172a;
          font-size: 14px;
        }

        .radar-preview {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .radar-preview-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 6px;
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
        }

        .check-pill.active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
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

        .question-top-left {
          display: grid;
          gap: 10px;
        }

        .question-text {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.45;
        }

        .difficulty-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
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
          display: grid;
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

        .notes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
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

        @media (max-width: 1200px) {
          .hero-grid,
          .radar-grid,
          .notes-grid,
          .info-grid,
          .radar-preview {
            grid-template-columns: 1fr 1fr;
          }

          .field.span-3 {
            grid-column: span 2;
          }

          .radar-chart-shell {
            height: 380px;
          }
        }

        @media (max-width: 780px) {
          .interview-shell {
            padding: 14px;
          }

          .title {
            font-size: 30px;
          }

          .hero-grid,
          .radar-grid,
          .notes-grid,
          .info-grid,
          .radar-preview {
            grid-template-columns: 1fr;
          }

          .field.span-3 {
            grid-column: span 1;
          }

          .score-big {
            font-size: 48px;
          }

          .radar-chart-shell {
            height: 320px;
          }

          .section-header {
            align-items: stretch;
          }
        }

        @media print {
          .interview-app {
            background: white !important;
          }

          .top-actions,
          .toolbar-actions,
          .organizer-card,
          .toggle-btn,
          .mini-btn,
          .lang-toggle,
          .btn,
          .question-card,
          .footer-result,
          .hero-grid,
          .radar-card,
          .screen-only,
          .mix-banner {
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

      <UtsTopNavBar />

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
                <button className="btn shuffle" onClick={regenerateQuestions}>
                  <Shuffle size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {current.changeQuestions}
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

            <div className="mix-banner">
              <div style={{ fontWeight: 900 }}>{current.balancedMix}</div>
              <div style={{ fontSize: 14 }}>{current.balancedMixHelp}</div>
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
                      Math.min((Math.max(totalScore, 0) / Math.max(totalQuestions, 1)) * 100, 100)
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

          <div className="glass-card organizer-card screen-only">
            <div className="header-top">
              <div>
                <h2 className="section-title">{text.organizerTitle}</h2>
                <p className="subtitle" style={{ marginTop: 8 }}>
                  {text.organizerHelp}
                </p>
              </div>

              <div className="organizer-actions">
                <button className="preset-btn" onClick={() => applyPreset("default")}>
                  {text.presetDefault}
                </button>
                <button className="preset-btn" onClick={() => applyPreset("helper")}>
                  {text.presetHelper}
                </button>
                <button className="preset-btn" onClick={() => applyPreset("industrial")}>
                  {text.presetIndustrial}
                </button>
                <button className="preset-btn" onClick={() => applyPreset("controls")}>
                  {text.presetControls}
                </button>
                <button className="preset-btn" onClick={() => applyPreset("journeyman")}>
                  {text.presetJourneyman}
                </button>
                <button className="preset-btn" onClick={resetOrder}>
                  <RotateCcw size={14} />
                  {text.resetOrder}
                </button>
                <button className="preset-btn" onClick={restoreAllSections}>
                  <Eye size={14} />
                  {text.restoreAll}
                </button>
              </div>
            </div>

            <div className="organizer-grid">
              {hiddenOrderedSections.length > 0 ? (
                <div className="organizer-panel">
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    {text.hiddenSections}
                  </div>
                  <div className="hidden-chip-row">
                    {hiddenOrderedSections.map(({ section }) => (
                      <button
                        key={section.id}
                        type="button"
                        className="hidden-chip-btn"
                        onClick={() => restoreSection(section.id)}
                      >
                        <Eye size={14} />
                        {section.title[language]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="organizer-panel">
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    {text.hiddenSections}
                  </div>
                  <div style={{ color: "#64748b" }}>{text.hiddenSectionsEmpty}</div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card radar-card screen-only">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <BarChart3 size={20} />
                <h2 className="section-title">{text.strengthMap}</h2>
              </div>

              <button
                type="button"
                className="radar-toggle-btn"
                onClick={() => setRadarOpen((prev) => !prev)}
              >
                {radarOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {radarOpen ? text.hideChart : text.showChart}
              </button>
            </div>

            {!radarOpen ? (
              <div className="radar-preview">
                <div className="radar-preview-card">
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {text.strongestArea}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {strongestSection ? strongestSection.fullSection : "—"}
                  </div>
                  <div style={{ color: "#475569", fontWeight: 700 }}>
                    {strongestSection
                      ? `${strongestSection.score}/${strongestSection.total} • ${strongestSection.percent}%`
                      : "—"}
                  </div>
                </div>

                <div className="radar-preview-card">
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {text.weakestArea}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {weakestSection ? weakestSection.fullSection : "—"}
                  </div>
                  <div style={{ color: "#475569", fontWeight: 700 }}>
                    {weakestSection
                      ? `${weakestSection.score}/${weakestSection.total} • ${weakestSection.percent}%`
                      : "—"}
                  </div>
                </div>

                <div className="radar-preview-card">
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {text.summary}
                  </div>
                  <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.6 }}>
                    {text.openChartHint}
                  </div>
                </div>
              </div>
            ) : (
              <div className="radar-grid">
                <div className="radar-chart-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="section" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tickCount={6} />
                      <Radar
                        name="Performance"
                        dataKey="percent"
                        stroke="#2563eb"
                        fill="#60a5fa"
                        fillOpacity={0.45}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="radar-side">
                  <div className="radar-mini">
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {text.quickRead}
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.6 }}>
                      {text.chartHelp}
                    </div>
                  </div>

                  <div className="radar-mini">
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {text.strongestArea}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {strongestSection ? strongestSection.fullSection : "—"}
                    </div>
                    <div style={{ color: "#475569", fontWeight: 700 }}>
                      {strongestSection
                        ? `${strongestSection.score}/${strongestSection.total} • ${strongestSection.percent}%`
                        : "—"}
                    </div>
                  </div>

                  <div className="radar-mini">
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {text.weakestArea}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {weakestSection ? weakestSection.fullSection : "—"}
                    </div>
                    <div style={{ color: "#475569", fontWeight: 700 }}>
                      {weakestSection
                        ? `${weakestSection.score}/${weakestSection.total} • ${weakestSection.percent}%`
                        : "—"}
                    </div>
                  </div>

                  <div className="radar-legend-row">
                    {radarData.map((item) => (
                      <div key={item.fullSection} className="radar-row">
                        <div className="radar-label">{item.fullSection}</div>
                        <div className="radar-meta">
                          {item.score}/{item.total}
                        </div>
                        <div className="radar-percent">{item.percent}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

          <div className="screen-only" style={{ display: "grid", gap: 16 }}>
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

            {visibleOrderedSections.map(({ section, sectionId }) => {
              const localizedSection = {
                id: section.id,
                title: section.title[language],
                activeQuestions: section.activeQuestions.map((q) => ({
                  id: q.id,
                  difficulty: q.difficulty,
                  prompt: q.prompt[language],
                  options: [...q.options[language], current.otherOption],
                  correctIndex: q.correctIndex,
                  otherIndex: q.options[language].length,
                })),
              };

              const sectionAnswered = localizedSection.activeQuestions.filter((q) => {
                const entry = answersMap?.[sectionId]?.[q.id];
                return entry?.selected !== null && entry?.selected !== undefined;
              }).length;

              const sectionCorrect = localizedSection.activeQuestions.reduce((sum, q) => {
                const selected = answersMap?.[sectionId]?.[q.id]?.selected;
                if (selected === null || selected === undefined) return sum;
                if (selected === q.otherIndex) return sum;
                return sum + (selected === q.correctIndex ? 1 : 0);
              }, 0);

              return (
                <div
                  key={sectionId}
                  className={`section-draggable ${draggedSectionId === sectionId ? "dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(sectionId)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(sectionId)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="section-header">
                    <div className="section-header-left">
                      <div className="drag-handle" title={text.dragHint}>
                        <GripVertical size={18} />
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <div className="section-card-title">{localizedSection.title}</div>
                        <div className="section-meta">
                          <span className="pill blue">
                            {sectionCorrect} / {localizedSection.activeQuestions.length} pts
                          </span>
                          <span className="pill gray">
                            {sectionAnswered} / {localizedSection.activeQuestions.length} {current.questions}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="organizer-actions">
                      <button
                        type="button"
                        className="section-action-btn"
                        onClick={() => hideSection(sectionId)}
                      >
                        <EyeOff size={14} />
                        {text.hideSection}
                      </button>

                      <button
                        className="toggle-btn"
                        onClick={() => toggleSection(sectionId)}
                      >
                        {openSections[sectionId] ? "−" : "+"}
                      </button>
                    </div>
                  </div>

                  {openSections[sectionId] && (
                    <div style={{ display: "grid", gap: 16 }}>
                      {localizedSection.activeQuestions.map((question, questionIndex) => {
                        const entry = answersMap?.[sectionId]?.[question.id] || {
                          selected: null,
                          otherText: "",
                        };
                        const selected = entry.selected;
                        const isOtherSelected = selected === question.otherIndex;

                        let statusClass = "pending";
                        let statusText = current.pending;

                        if (selected !== null && selected !== undefined) {
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
                          <div key={question.id} className="question-card">
                            <div className="question-head">
                              <div className="question-top-left">
                                <div
                                  className="difficulty-badge"
                                  style={difficultyBadgeStyle(question.difficulty)}
                                >
                                  {difficultyLabel(question.difficulty)}
                                </div>
                                <div className="question-text">
                                  {questionIndex + 1}. {question.prompt}
                                </div>
                              </div>

                              <div className={`status ${statusClass}`}>{statusText}</div>
                            </div>

                            <div className="options-grid">
                              {question.options.map((option, optionIndex) => {
                                const selectedThis = selected === optionIndex;
                                let extraClass = "";

                                if (selected !== null && selected !== undefined && selectedThis) {
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
                                    key={`${question.id}-${option}`}
                                    className={`option-btn ${extraClass}`}
                                    onClick={() =>
                                      handleAnswer(sectionId, question.id, optionIndex)
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
                                    handleOtherText(sectionId, question.id, e.target.value)
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
              <div className="print-meta">
                <strong>Preset:</strong> {layoutPresetUsed || "default"}
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

      <GoToTopButton showAfter={600} />
    </>
  );
}