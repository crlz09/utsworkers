export const UI_TEXT = {
  es: {
    title: "UTS – Evaluación Telefónica",
    subtitle: "Herramienta visual para evaluar candidatos en tiempo real.",
    langEs: "Español",
    langEn: "English",
    totalScore: "Puntaje total",
    autoScore: "Preguntas correctas",
    manualAdjust: "Ajuste manual",
    classification: "Clasificación",
    apprentice: "APPRENTICE",
    topHelper: "TOP HELPER",
    jm: "JM",
    candidateInfo: "Datos del candidato",
    name: "Nombre",
    date: "Fecha",
    position: "Posición",
    phone: "Teléfono",
    email: "Email",
    address: "Dirección",
    candidateLanguage: "Idioma del candidato",
    spanishCheck: "Spanish",
    englishCheck: "English",
    notes: "Quick notes",
    summary: "Final summary",
    notesPlaceholder:
      "Ej: buena actitud, experiencia industrial real, inglés básico funcional, disponible para viajar, parece honesto, responde con seguridad...",
    summaryPlaceholder:
      "Escribe aquí tu impresión final del candidato y cualquier detalle fuera del formulario.",
    reset: "Resetear",
    print: "Imprimir / Exportar PDF",
    save: "Guardar entrevista",
    saving: "Guardando...",
    saved: "Entrevista guardada",
    saveError: "No se pudo guardar la entrevista",
    expandAll: "Expandir todo",
    collapseAll: "Colapsar todo",
    correct: "Correcto",
    incorrect: "Incorrecto",
    pending: "Pendiente",
    addPoint: "Agregar punto",
    removePoint: "Quitar punto",
    noSelection: "Sin responder",
    finalResult: "Resultado final",
    answered: "Respondidas",
    questions: "preguntas",
    manualLabel: "Puntos extra",
    otherOption: "Otro",
    otherPlaceholder:
      "Escribe aquí la respuesta del candidato o tu explicación para asignar puntos manualmente...",
    neutral: "Neutro",
    selectedAnswer: "Respuesta seleccionada",
    otherResponse: "Respuesta escrita",
    questionBank: "Banco de preguntas",
    thresholds: {
      apprentice: "0–20",
      topHelper: "21–34",
      jm: "35+",
    },
  },
  en: {
    title: "UTS – Phone Evaluation",
    subtitle: "Visual tool to evaluate candidates in real time.",
    langEs: "Español",
    langEn: "English",
    totalScore: "Total score",
    autoScore: "Correct answers",
    manualAdjust: "Manual adjustment",
    classification: "Classification",
    apprentice: "APPRENTICE",
    topHelper: "TOP HELPER",
    jm: "JM",
    candidateInfo: "Candidate information",
    name: "Name",
    date: "Date",
    position: "Position",
    phone: "Phone",
    email: "Email",
    address: "Address",
    candidateLanguage: "Candidate language",
    spanishCheck: "Spanish",
    englishCheck: "English",
    notes: "Quick notes",
    summary: "Final summary",
    notesPlaceholder:
      "Ex: strong attitude, real industrial experience, functional basic English, open to travel, seems reliable, answers confidently...",
    summaryPlaceholder:
      "Write your final impression of the candidate and any extra details outside the form.",
    reset: "Reset",
    print: "Print / Export PDF",
    save: "Save interview",
    saving: "Saving...",
    saved: "Interview saved",
    saveError: "Could not save interview",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    correct: "Correct",
    incorrect: "Incorrect",
    pending: "Pending",
    addPoint: "Add point",
    removePoint: "Remove point",
    noSelection: "Unanswered",
    finalResult: "Final result",
    answered: "Answered",
    questions: "questions",
    manualLabel: "Extra points",
    otherOption: "Other",
    otherPlaceholder:
      "Write the candidate's answer or your explanation here so you can assign points manually...",
    neutral: "Neutral",
    selectedAnswer: "Selected answer",
    otherResponse: "Written response",
    questionBank: "Question Bank",
    thresholds: {
      apprentice: "0–20",
      topHelper: "21–34",
      jm: "35+",
    },
  },
};

export const QUESTION_BANK = [
  {
    title: { es: "1. Wire / Cable Pulling", en: "1. Wire / Cable Pulling" },
    questions: [
      {
        prompt: {
          es: "¿Cuál cable es físicamente más grande?",
          en: "Which cable is physically larger?",
        },
        options: {
          es: ["AWG 12", "AWG 4"],
          en: ["AWG 12", "AWG 4"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué equipo se usa para halar cables grandes a través de conduit?",
          en: "What equipment is used to pull large cables through conduit?",
        },
        options: {
          es: ["Fish tape", "Cable tugger / wire puller", "Multimeter"],
          en: ["Fish tape", "Cable tugger / wire puller", "Multimeter"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué colores se usan en sistemas 120/240V?",
          en: "What colors are used in 120/240V systems?",
        },
        options: {
          es: [
            "Brown, Orange, Yellow",
            "Black, Red, Blue, White (neutral), Green (ground)",
            "Yellow, Purple, Gray",
          ],
          en: [
            "Brown, Orange, Yellow",
            "Black, Red, Blue, White (neutral), Green (ground)",
            "Yellow, Purple, Gray",
          ],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "2. Motors & Controllers", en: "2. Motors & Controllers" },
    questions: [
      {
        prompt: { es: "¿Qué hace un VFD?", en: "What does a VFD do?" },
        options: {
          es: [
            "Convierte AC a DC",
            "Controla la velocidad del motor variando frecuencia y voltaje",
            "Aumenta el voltaje",
          ],
          en: [
            "Converts AC to DC",
            "Controls motor speed by varying frequency and voltage",
            "Increases voltage",
          ],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Cómo se invierte un motor trifásico?",
          en: "How do you reverse a 3-phase motor?",
        },
        options: {
          es: ["Cambiar el breaker", "Intercambiar dos fases", "Agregar una resistencia"],
          en: ["Change breaker", "Swap two phases", "Add a resistor"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Cuál es una ventaja clave de un motor trifásico?",
          en: "What is a key advantage of a 3-phase motor?",
        },
        options: {
          es: ["Usa más energía", "Es más eficiente y self-starting", "Necesita baterías"],
          en: ["Uses more energy", "More efficient and self-starting", "Needs batteries"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "3. PLC / Controls", en: "3. PLC / Controls" },
    questions: [
      {
        prompt: { es: "¿Qué es un PLC?", en: "What is a PLC?" },
        options: {
          es: [
            "Un tipo de motor",
            "Un controlador programable usado para automatización",
            "Un medidor de voltaje",
          ],
          en: [
            "A type of motor",
            "Programmable controller used for automation",
            "Voltage meter",
          ],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué representa un ladder diagram?",
          en: "What does a ladder diagram represent?",
        },
        options: {
          es: ["La distribución física", "La lógica de control", "Caída de voltaje"],
          en: ["Physical layout", "Control logic", "Voltage drop"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Diferencia entre digital input y output?",
          en: "Digital input vs output?",
        },
        options: {
          es: [
            "El input envía potencia",
            "El input recibe señal / el output controla un dispositivo",
            "No hay diferencia",
          ],
          en: [
            "Input sends power",
            "Input receives signal / Output controls device",
            "No difference",
          ],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "4. Troubleshooting", en: "4. Troubleshooting" },
    questions: [
      {
        prompt: {
          es: "Si un motor no arranca, ¿qué revisas primero?",
          en: "First thing to check if a motor doesn’t start?",
        },
        options: {
          es: ["El color de la pintura", "Voltaje de alimentación / breaker", "La longitud del cable"],
          en: ["Paint color", "Voltage supply / breaker", "Cable length"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "¿Qué hace un overload?", en: "What does an overload do?" },
        options: {
          es: ["Acelera el motor", "Protege contra sobrecorriente", "Aterriza el sistema"],
          en: ["Speeds motor", "Protects from overcurrent", "Grounds system"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "Si un contactor no cierra, ¿qué podría pasar?",
          en: "Contactor won’t close. Possible issue?",
        },
        options: {
          es: ["Demasiado aceite", "No hay voltaje en la bobina", "El cable es muy largo"],
          en: ["Too much oil", "No voltage at coil", "Wire too long"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "5. Conduit (Rigid / EMT)", en: "5. Conduit (Rigid / EMT)" },
    questions: [
      {
        prompt: {
          es: "¿Qué herramienta se usa para doblar EMT de ½”?",
          en: "Tool for bending EMT (½”)?",
        },
        options: {
          es: ["Pipe wrench", "Hand bender", "Hammer"],
          en: ["Pipe wrench", "Hand bender", "Hammer"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "¿Qué es un offset?", en: "What is an offset?" },
        options: {
          es: ["Un tramo recto", "Un doblez para librar un obstáculo", "Un método de grounding"],
          en: ["A straight run", "Bend to bypass obstacle", "Grounding method"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué pasa si el EMT se dobla incorrectamente?",
          en: "What happens if EMT is bent incorrectly?",
        },
        options: {
          es: ["Se hace más fuerte", "Puede colapsar o deformarse", "Conduce mejor"],
          en: ["Gets stronger", "Can collapse/deform", "Conducts better"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "6. Conduit Types", en: "6. Conduit Types" },
    questions: [
      {
        prompt: { es: "¿Dónde se usa comúnmente PVC?", en: "Where is PVC commonly used?" },
        options: {
          es: ["Oficina seca", "Underground / áreas húmedas", "Dentro de paneles"],
          en: ["Dry office", "Underground / wet areas", "Inside panels"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Por qué usar stainless steel conduit?",
          en: "Why stainless steel conduit?",
        },
        options: {
          es: ["Es más barato", "Resistencia a la corrosión", "Es flexible"],
          en: ["Cheaper", "Corrosion resistance", "Flexible"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿PVC requiere conductor de tierra?",
          en: "Does PVC require grounding conductor?",
        },
        options: {
          es: [
            "No necesita grounding",
            "Sí, requiere un conductor de tierra separado",
            "Solo a veces",
          ],
          en: [
            "No grounding needed",
            "Yes, separate grounding conductor required",
            "Only sometimes",
          ],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "7. Blueprints", en: "7. Blueprints" },
    questions: [
      {
        prompt: {
          es: "¿Qué muestran los planos eléctricos?",
          en: "What do electrical drawings show?",
        },
        options: {
          es: ["Solo materiales", "Equipos, circuitos y layout", "Solo voltaje"],
          en: ["Only materials", "Equipment, circuits, layout", "Only voltage"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué son las specifications (specs)?",
          en: "What are specifications (specs)?",
        },
        options: {
          es: ["Costos", "Requisitos técnicos", "Cronograma"],
          en: ["Costs", "Technical requirements", "Schedule"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué representa el símbolo del breaker?",
          en: "Breaker symbol represents?",
        },
        options: {
          es: ["Motor", "Protección del circuito", "Tierra"],
          en: ["Motor", "Circuit protection", "Ground"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "8. Ladder / Schematics", en: "8. Ladder / Schematics" },
    questions: [
      {
        prompt: {
          es: "¿Qué representan las líneas verticales?",
          en: "Vertical lines represent?",
        },
        options: {
          es: ["Tierra", "Power rails", "Carga"],
          en: ["Ground", "Power rails", "Load"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué es un contacto Normally Open (NO)?",
          en: "Normally Open (NO) contact?",
        },
        options: {
          es: ["Siempre cerrado", "Cierra cuando se activa", "Siempre abierto"],
          en: ["Always closed", "Closes when activated", "Always open"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "¿Qué representa una coil?", en: "Coil represents?" },
        options: {
          es: ["Input", "Dispositivo de salida", "Tierra"],
          en: ["Input", "Output device", "Ground"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "9. Branch Circuits", en: "9. Branch Circuits" },
    questions: [
      {
        prompt: {
          es: "¿Qué es un branch circuit?",
          en: "What is a branch circuit?",
        },
        options: {
          es: ["Main service", "Circuito desde el breaker hasta la carga", "Sistema de tierra"],
          en: ["Main service", "Circuit from breaker to load", "Ground system"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Amperaje típico de un circuito de iluminación?",
          en: "Typical lighting circuit amperage?",
        },
        options: {
          es: ["5A", "15–20A", "50A"],
          en: ["5A", "15–20A", "50A"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué protege ese circuito?",
          en: "What protects it?",
        },
        options: {
          es: ["Transformer", "Breaker / fuse", "Motor"],
          en: ["Transformer", "Breaker/fuse", "Motor"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "10. Switchgear", en: "10. Switchgear" },
    questions: [
      {
        prompt: { es: "¿Qué es switchgear?", en: "What is switchgear?" },
        options: {
          es: [
            "Método de cableado",
            "Equipo para control y protección de potencia",
            "Luminaria",
          ],
          en: [
            "Wiring method",
            "Equipment for control/protection of power",
            "Light fixture",
          ],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Dónde se usa comúnmente?",
          en: "Where is it used?",
        },
        options: {
          es: ["Solo residencial", "Industrial / comercial", "Vehículos"],
          en: ["Residential only", "Industrial/commercial", "Vehicles"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "¿Qué incluye?", en: "What does it include?" },
        options: {
          es: ["Tubos", "Breakers, disconnects y protección", "Solo cables"],
          en: ["Pipes", "Breakers, disconnects, protection", "Only wires"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "11. Cable Tray", en: "11. Cable Tray" },
    questions: [
      {
        prompt: {
          es: "¿Cuál es el propósito del cable tray?",
          en: "Purpose of cable tray?",
        },
        options: {
          es: ["Proteger tuberías", "Soportar cables", "Grounding"],
          en: ["Protect pipes", "Support cables", "Grounding"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Puede reemplazar conduit?",
          en: "Can it replace conduit?",
        },
        options: {
          es: ["No", "Sí, en muchos casos industriales", "Solo afuera"],
          en: ["No", "Yes (in many industrial cases)", "Only outside"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Factor clave de instalación?",
          en: "Key installation factor?",
        },
        options: {
          es: ["Pintura", "Soporte y spacing", "Color"],
          en: ["Paint", "Support and spacing", "Color"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "12. Voltage Levels", en: "12. Voltage Levels" },
    questions: [
      {
        prompt: {
          es: "¿Desde qué voltaje empieza medium voltage?",
          en: "Medium voltage starts at?",
        },
        options: {
          es: ["120V", "1000V+", "12V"],
          en: ["120V", "1000V+", "12V"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Requisito clave de seguridad?",
          en: "Key safety requirement?",
        },
        options: {
          es: ["Solo guantes", "PPE especializado", "Ninguno"],
          en: ["Gloves only", "Specialized PPE", "None"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Es igual al trabajo de low voltage?",
          en: "Same as low voltage work?",
        },
        options: {
          es: ["Sí", "No, requiere procedimientos distintos", "A veces"],
          en: ["Yes", "No, requires different procedures", "Sometimes"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "13. Instrumentation", en: "13. Instrumentation" },
    questions: [
      {
        prompt: { es: "¿Qué es 4–20 mA?", en: "What is 4–20 mA?" },
        options: {
          es: ["Voltaje", "Señal analógica estándar", "Frecuencia"],
          en: ["Voltage", "Standard analog signal", "Frequency"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué hace instrumentation?",
          en: "What does instrumentation do?",
        },
        options: {
          es: ["Alimenta motores", "Monitorea y controla procesos", "Aterriza circuitos"],
          en: ["Powers motors", "Monitors and controls processes", "Grounds circuits"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Qué mide un pressure sensor?",
          en: "Pressure sensor measures?",
        },
        options: {
          es: ["Voltaje", "Presión", "Velocidad"],
          en: ["Voltage", "Pressure", "Speed"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "14. NEC", en: "14. NEC" },
    questions: [
      {
        prompt: { es: "¿Qué es NEC?", en: "What is NEC?" },
        options: {
          es: ["Una empresa", "Código eléctrico", "Una herramienta"],
          en: ["Company", "Electrical code", "Tool"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Por qué es importante?",
          en: "Why is it important?",
        },
        options: {
          es: ["Es opcional", "Seguridad y cumplimiento", "Costo"],
          en: ["Optional", "Safety and compliance", "Cost"],
        },
        correctIndex: 1,
      },
      {
        prompt: {
          es: "¿Cada cuánto se actualiza?",
          en: "How often updated?",
        },
        options: {
          es: ["10 años", "~3 años", "Nunca"],
          en: ["10 years", "~3 years", "Never"],
        },
        correctIndex: 1,
      },
    ],
  },
  {
    title: { es: "15. Electrical Math", en: "15. Electrical Math" },
    questions: [
      {
        prompt: { es: "¿Fórmula de potencia?", en: "Power formula?" },
        options: {
          es: ["P = I / V", "P = V × I", "P = R × I"],
          en: ["P = I / V", "P = V × I", "P = R × I"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "120V × 10A = ?", en: "120V × 10A = ?" },
        options: {
          es: ["120W", "1200W", "12W"],
          en: ["120W", "1200W", "12W"],
        },
        correctIndex: 1,
      },
      {
        prompt: { es: "¿Ohm’s Law?", en: "Ohm’s Law?" },
        options: {
          es: ["V = I × R", "V = P × I", "R = V × I"],
          en: ["V = I × R", "V = P × I", "R = V × I"],
        },
        correctIndex: 0,
      },
    ],
  },
];