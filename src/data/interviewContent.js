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
    changeQuestions: "Cambiar preguntas",
    changingQuestionsWarning:
      "Esto reemplazará las preguntas actuales y borrará las respuestas de esta entrevista. ¿Deseas continuar?",
    balancedMix: "Mix inteligente",
    balancedMixHelp:
      "Cada sección usa 1 pregunta fácil, 1 intermedia y 1 avanzada seleccionadas aleatoriamente.",
    difficultyBasic: "Fácil",
    difficultyIntermediate: "Intermedia",
    difficultyAdvanced: "Avanzada",
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
    changeQuestions: "Change questions",
    changingQuestionsWarning:
      "This will replace the current questions and clear the answers for this interview. Do you want to continue?",
    balancedMix: "Smart mix",
    balancedMixHelp:
      "Each section uses 1 easy, 1 intermediate, and 1 advanced question selected at random.",
    difficultyBasic: "Easy",
    difficultyIntermediate: "Intermediate",
    difficultyAdvanced: "Advanced",
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
    id: "wire-cable-pulling",
    title: { es: "1. Wire / Cable Pulling", en: "1. Wire / Cable Pulling" },
    questions: [
      {
        id: "wire_001",
        difficulty: "basic",
        prompt: {
          es: "¿Cuál cable es físicamente más grande?",
          en: "Which cable is physically larger?",
        },
        options: { es: ["AWG 12", "AWG 4", "AWG 14"], en: ["AWG 12", "AWG 4", "AWG 14"] },
        correctIndex: 1,
      },
      {
        id: "wire_002",
        difficulty: "basic",
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
        id: "wire_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué ayuda a reducir la fricción al halar cable?",
          en: "What helps reduce friction when pulling cable?",
        },
        options: {
          es: ["Lubricante para cable", "Cinta aislante", "Más voltaje"],
          en: ["Cable lubricant", "Electrical tape", "More voltage"],
        },
        correctIndex: 0,
      },
      {
        id: "wire_004",
        difficulty: "intermediate",
        prompt: {
          es: "Antes de un cable pull largo, ¿qué debes revisar?",
          en: "Before a long cable pull, what should you verify?",
        },
        options: {
          es: ["Conduit fill y ruta", "Color de la caja", "Edad del panel"],
          en: ["Conduit fill and route", "Box color", "Panel age"],
        },
        correctIndex: 0,
      },
      {
        id: "wire_005",
        difficulty: "advanced",
        prompt: {
          es: "Si el sidewall pressure es demasiado alto durante un pull, ¿qué riesgo principal existe?",
          en: "If sidewall pressure is too high during a pull, what is the main risk?",
        },
        options: {
          es: ["Daño al aislamiento del cable", "Menor consumo del motor", "Mejor tracción"],
          en: ["Cable insulation damage", "Lower motor draw", "Better traction"],
        },
        correctIndex: 0,
      },
      {
        id: "wire_006",
        difficulty: "advanced",
        prompt: {
          es: "En un cable pull complejo, ¿qué práctica mejora más la seguridad y el control?",
          en: "In a complex cable pull, what practice most improves safety and control?",
        },
        options: {
          es: ["Comunicación clara entre estaciones", "Aumentar la velocidad", "Quitar el lubricante"],
          en: ["Clear communication between stations", "Increase speed", "Remove lubricant"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "motors-controllers",
    title: { es: "2. Motors & Controllers", en: "2. Motors & Controllers" },
    questions: [
      {
        id: "motor_001",
        difficulty: "basic",
        prompt: { es: "¿Qué hace un VFD?", en: "What does a VFD do?" },
        options: {
          es: [
            "Convierte AC a DC solamente",
            "Controla la velocidad del motor variando frecuencia y voltaje",
            "Aumenta el amperaje del breaker",
          ],
          en: [
            "Only converts AC to DC",
            "Controls motor speed by varying frequency and voltage",
            "Raises breaker amperage",
          ],
        },
        correctIndex: 1,
      },
      {
        id: "motor_002",
        difficulty: "basic",
        prompt: {
          es: "¿Cómo se invierte un motor trifásico?",
          en: "How do you reverse a 3-phase motor?",
        },
        options: {
          es: ["Cambiar breaker", "Intercambiar dos fases", "Agregar una resistencia"],
          en: ["Change breaker", "Swap two phases", "Add a resistor"],
        },
        correctIndex: 1,
      },
      {
        id: "motor_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué puede causar que un overload dispare repetidamente?",
          en: "What can cause an overload to trip repeatedly?",
        },
        options: {
          es: ["Sobrecarga mecánica", "Un color incorrecto del cable", "Demasiada pintura"],
          en: ["Mechanical overload", "Wrong wire color", "Too much paint"],
        },
        correctIndex: 0,
      },
      {
        id: "motor_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué indica la placa del motor entre otros datos importantes?",
          en: "What does the motor nameplate indicate among other key data?",
        },
        options: {
          es: ["Voltaje y corriente nominal", "Nombre del instalador", "Solo el color del motor"],
          en: ["Rated voltage and current", "Installer name", "Only motor color"],
        },
        correctIndex: 0,
      },
      {
        id: "motor_005",
        difficulty: "advanced",
        prompt: {
          es: "Si un VFD muestra overcurrent al arrancar, ¿qué sería una revisión lógica primero?",
          en: "If a VFD shows overcurrent at startup, what is a logical first check?",
        },
        options: {
          es: ["Rampa de aceleración y carga del motor", "Color del conduit", "Número de tornillos de la tapa"],
          en: ["Acceleration ramp and motor load", "Conduit color", "Number of cover screws"],
        },
        correctIndex: 0,
      },
      {
        id: "motor_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué ventaja técnica importante tiene un soft starter frente a un arranque directo?",
          en: "What is an important technical advantage of a soft starter compared to across-the-line starting?",
        },
        options: {
          es: ["Reduce el inrush current", "Elimina necesidad de protección", "Aumenta frecuencia de salida"],
          en: ["Reduces inrush current", "Eliminates need for protection", "Raises output frequency"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "plc-controls",
    title: { es: "3. PLC / Controls", en: "3. PLC / Controls" },
    questions: [
      {
        id: "plc_001",
        difficulty: "basic",
        prompt: { es: "¿Qué es un PLC?", en: "What is a PLC?" },
        options: {
          es: [
            "Un tipo de motor",
            "Un controlador programable usado para automatización",
            "Un medidor de voltaje",
          ],
          en: [
            "A type of motor",
            "A programmable controller used for automation",
            "A voltage meter",
          ],
        },
        correctIndex: 1,
      },
      {
        id: "plc_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué representa un ladder diagram?",
          en: "What does a ladder diagram represent?",
        },
        options: {
          es: ["La lógica de control", "Solo el layout físico", "El costo del panel"],
          en: ["Control logic", "Only the physical layout", "Panel cost"],
        },
        correctIndex: 0,
      },
      {
        id: "plc_003",
        difficulty: "intermediate",
        prompt: {
          es: "En control, una entrada digital normalmente hace qué función?",
          en: "In controls, a digital input typically does what?",
        },
        options: {
          es: ["Recibe una señal de campo", "Alimenta un motor grande", "Cambia frecuencia"],
          en: ["Receives a field signal", "Powers a large motor", "Changes frequency"],
        },
        correctIndex: 0,
      },
      {
        id: "plc_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué elemento usarías para detectar posición de un cilindro?",
          en: "What would you use to detect cylinder position?",
        },
        options: {
          es: ["Sensor prox o limit switch", "Breaker principal", "Ground rod"],
          en: ["Prox sensor or limit switch", "Main breaker", "Ground rod"],
        },
        correctIndex: 0,
      },
      {
        id: "plc_005",
        difficulty: "advanced",
        prompt: {
          es: "Si una salida PLC cambia en programa pero el dispositivo no energiza, ¿qué falta revisar además del código?",
          en: "If a PLC output changes in the program but the device does not energize, what else should be checked besides the code?",
        },
        options: {
          es: ["Fuente y circuito físico de salida", "Color del HMI", "Altura del panel"],
          en: ["Power source and physical output circuit", "HMI color", "Panel height"],
        },
        correctIndex: 0,
      },
      {
        id: "plc_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué ventaja tiene usar entradas y salidas direccionadas claramente y etiquetadas?",
          en: "What is an advantage of using clearly addressed and labeled I/O?",
        },
        options: {
          es: ["Facilita troubleshooting y mantenimiento", "Reduce el voltaje automáticamente", "Elimina la necesidad de dibujos"],
          en: ["Makes troubleshooting and maintenance easier", "Automatically lowers voltage", "Eliminates the need for drawings"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "troubleshooting",
    title: { es: "4. Troubleshooting", en: "4. Troubleshooting" },
    questions: [
      {
        id: "trbl_001",
        difficulty: "basic",
        prompt: {
          es: "Si un motor no arranca, ¿qué revisas primero?",
          en: "If a motor will not start, what do you check first?",
        },
        options: {
          es: ["Voltaje de alimentación / breaker", "Color de pintura", "Longitud del cable"],
          en: ["Power supply voltage / breaker", "Paint color", "Cable length"],
        },
        correctIndex: 0,
      },
      {
        id: "trbl_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué hace un overload?",
          en: "What does an overload do?",
        },
        options: {
          es: ["Protege contra sobrecorriente", "Acelera el motor", "Cambia frecuencia"],
          en: ["Protects against overcurrent", "Speeds up the motor", "Changes frequency"],
        },
        correctIndex: 0,
      },
      {
        id: "trbl_003",
        difficulty: "intermediate",
        prompt: {
          es: "Si un contactor no cierra, ¿qué revisión es lógica?",
          en: "If a contactor will not pull in, what is a logical check?",
        },
        options: {
          es: ["Voltaje en la bobina", "Color de la tapa", "Marca del conduit"],
          en: ["Voltage at the coil", "Cover color", "Conduit brand"],
        },
        correctIndex: 0,
      },
      {
        id: "trbl_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Cuál es una buena práctica general de troubleshooting?",
          en: "What is a good general troubleshooting practice?",
        },
        options: {
          es: ["Ir de lo simple a lo complejo", "Cambiar piezas al azar", "Asumir que el PLC siempre es el problema"],
          en: ["Go from simple to complex", "Replace parts at random", "Assume the PLC is always the problem"],
        },
        correctIndex: 0,
      },
      {
        id: "trbl_005",
        difficulty: "advanced",
        prompt: {
          es: "Si una falla es intermitente, ¿qué ayuda mucho a encontrar el problema?",
          en: "If a fault is intermittent, what helps a lot in finding the problem?",
        },
        options: {
          es: ["Revisar tendencias, eventos o condiciones repetibles", "Cambiar todos los breakers", "Ignorar los tiempos"],
          en: ["Review trends, events, or repeatable conditions", "Replace all breakers", "Ignore timing"],
        },
        correctIndex: 0,
      },
      {
        id: "trbl_006",
        difficulty: "advanced",
        prompt: {
          es: "En troubleshooting seguro, antes de medir dentro de un equipo energizado debes confirmar qué?",
          en: "In safe troubleshooting, before measuring inside energized equipment you should confirm what?",
        },
        options: {
          es: ["PPE y procedimiento adecuados", "Que el panel esté limpio", "Que el cable sea THHN"],
          en: ["Proper PPE and procedure", "That the panel is clean", "That the cable is THHN"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "conduit-rigid-emt",
    title: { es: "5. Conduit (Rigid / EMT)", en: "5. Conduit (Rigid / EMT)" },
    questions: [
      {
        id: "emt_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué herramienta se usa para doblar EMT de 1/2 pulgada?",
          en: "What tool is used to bend 1/2 inch EMT?",
        },
        options: {
          es: ["Hand bender", "Hammer", "Pipe wrench"],
          en: ["Hand bender", "Hammer", "Pipe wrench"],
        },
        correctIndex: 0,
      },
      {
        id: "emt_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué es un offset?",
          en: "What is an offset?",
        },
        options: {
          es: ["Un doblez para librar un obstáculo", "Una tierra física", "Un panel de control"],
          en: ["A bend to clear an obstacle", "A grounding rod", "A control panel"],
        },
        correctIndex: 0,
      },
      {
        id: "emt_003",
        difficulty: "intermediate",
        prompt: {
          es: "Si el EMT se deforma al doblarlo, ¿qué problema genera?",
          en: "If EMT gets deformed during bending, what problem does it create?",
        },
        options: {
          es: ["Dificulta pasar el cable", "Mejora el grounding", "Reduce el peso"],
          en: ["Makes wire pulling harder", "Improves grounding", "Reduces weight"],
        },
        correctIndex: 0,
      },
      {
        id: "emt_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Para qué sirve un coupling en EMT?",
          en: "What is a coupling used for in EMT?",
        },
        options: {
          es: ["Unir dos tramos de conduit", "Cambiar voltaje", "Medir continuidad"],
          en: ["Join two pieces of conduit", "Change voltage", "Measure continuity"],
        },
        correctIndex: 0,
      },
      {
        id: "emt_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué efecto puede tener no considerar el take-up correcto del bender?",
          en: "What can happen if you do not account for the correct bender take-up?",
        },
        options: {
          es: ["La medida final queda incorrecta", "El EMT cambia de material", "El circuito se vuelve trifásico"],
          en: ["The final measurement will be wrong", "The EMT changes material", "The circuit becomes three-phase"],
        },
        correctIndex: 0,
      },
      {
        id: "emt_006",
        difficulty: "advanced",
        prompt: {
          es: "En una instalación limpia, ¿qué demuestra mejor buena mano de conduit?",
          en: "In a clean installation, what best demonstrates good conduit work?",
        },
        options: {
          es: ["Runs alineados, soportados y bien medidos", "Más conectores de los necesarios", "Doblar todo en sitio sin medir"],
          en: ["Aligned, supported, and well-measured runs", "More connectors than needed", "Bend everything in place without measuring"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "conduit-types",
    title: { es: "6. Conduit Types", en: "6. Conduit Types" },
    questions: [
      {
        id: "ctype_001",
        difficulty: "basic",
        prompt: {
          es: "¿Dónde se usa comúnmente PVC?",
          en: "Where is PVC commonly used?",
        },
        options: {
          es: ["Underground o áreas húmedas", "Dentro de MCC energizado", "Solo sobre techos interiores decorativos"],
          en: ["Underground or wet areas", "Inside energized MCCs", "Only decorative indoor ceilings"],
        },
        correctIndex: 0,
      },
      {
        id: "ctype_002",
        difficulty: "basic",
        prompt: {
          es: "¿Por qué se usa stainless steel conduit?",
          en: "Why is stainless steel conduit used?",
        },
        options: {
          es: ["Por resistencia a la corrosión", "Porque es flexible", "Porque siempre es más barato"],
          en: ["For corrosion resistance", "Because it is flexible", "Because it is always cheaper"],
        },
        correctIndex: 0,
      },
      {
        id: "ctype_003",
        difficulty: "intermediate",
        prompt: {
          es: "Si usas PVC, ¿qué ocurre con el grounding path del conduit?",
          en: "If you use PVC, what happens to the conduit grounding path?",
        },
        options: {
          es: ["Necesitas conductor de tierra separado", "El PVC sirve como tierra", "No necesitas tierra nunca"],
          en: ["You need a separate grounding conductor", "PVC serves as ground", "You never need ground"],
        },
        correctIndex: 0,
      },
      {
        id: "ctype_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué tipo de conduit elegirías donde hay alta corrosión química?",
          en: "What conduit type would you choose in a high chemical corrosion area?",
        },
        options: {
          es: ["Material resistente a corrosión adecuado a la aplicación", "Solo EMT delgado", "Cualquier conduit sirve igual"],
          en: ["Corrosion-resistant material suited to the application", "Only thin EMT", "Any conduit works the same"],
        },
        correctIndex: 0,
      },
      {
        id: "ctype_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué factor técnico también influye al escoger un tipo de conduit además del ambiente?",
          en: "What technical factor also affects conduit selection besides the environment?",
        },
        options: {
          es: ["Protección mecánica requerida", "Nombre del cliente", "Color del edificio"],
          en: ["Required mechanical protection", "Client name", "Building color"],
        },
        correctIndex: 0,
      },
      {
        id: "ctype_006",
        difficulty: "advanced",
        prompt: {
          es: "En áreas washdown o food grade, ¿qué característica de instalación suele ser importante?",
          en: "In washdown or food-grade areas, what installation characteristic is often important?",
        },
        options: {
          es: ["Material y acabado fáciles de limpiar y resistentes", "Más offsets decorativos", "Usar solo conduit pintado"],
          en: ["Material and finish that are durable and easy to clean", "More decorative offsets", "Use only painted conduit"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "blueprints",
    title: { es: "7. Blueprints", en: "7. Blueprints" },
    questions: [
      {
        id: "blue_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué muestran los planos eléctricos?",
          en: "What do electrical drawings show?",
        },
        options: {
          es: ["Equipos, circuitos y layout", "Solo materiales", "Solo voltaje"],
          en: ["Equipment, circuits, and layout", "Only materials", "Only voltage"],
        },
        correctIndex: 0,
      },
      {
        id: "blue_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué son las specifications (specs)?",
          en: "What are specifications (specs)?",
        },
        options: {
          es: ["Requisitos técnicos", "Fechas de cumpleaños", "Publicidad del proyecto"],
          en: ["Technical requirements", "Birthdays", "Project advertising"],
        },
        correctIndex: 0,
      },
      {
        id: "blue_003",
        difficulty: "intermediate",
        prompt: {
          es: "Si el plano y el field parecen no coincidir, ¿qué es importante revisar?",
          en: "If the drawing and the field seem not to match, what is important to check?",
        },
        options: {
          es: ["La revisión más reciente del dibujo", "El color del papel", "Solo el título del proyecto"],
          en: ["The latest drawing revision", "Paper color", "Only the project title"],
        },
        correctIndex: 0,
      },
      {
        id: "blue_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué utilidad tienen las leyendas y símbolos del plano?",
          en: "What is the use of legends and drawing symbols?",
        },
        options: {
          es: ["Identificar componentes y significado", "Medir amperaje", "Calcular payroll"],
          en: ["Identify components and meaning", "Measure amperage", "Calculate payroll"],
        },
        correctIndex: 0,
      },
      {
        id: "blue_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué ayuda a evitar errores costosos al interpretar drawings complejos?",
          en: "What helps avoid costly mistakes when reading complex drawings?",
        },
        options: {
          es: ["Cruzar plano, specs y detalles de instalación", "Mirar solo una hoja", "Asumir que todo es igual al proyecto anterior"],
          en: ["Cross-check drawings, specs, and installation details", "Look at only one sheet", "Assume it is the same as the last project"],
        },
        correctIndex: 0,
      },
      {
        id: "blue_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué es importante entender one-lines además de layouts?",
          en: "Why is it important to understand one-lines in addition to layouts?",
        },
        options: {
          es: ["Porque muestran cómo se distribuye la energía", "Porque reemplazan el NEC", "Porque solo sirven para estimados de pintura"],
          en: ["Because they show how power is distributed", "Because they replace the NEC", "Because they are only for paint estimates"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "ladder-schematics",
    title: { es: "8. Ladder / Schematics", en: "8. Ladder / Schematics" },
    questions: [
      {
        id: "ladder_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué representan las líneas verticales en ladder?",
          en: "What do the vertical lines represent in ladder diagrams?",
        },
        options: {
          es: ["Power rails", "Ground rods", "Motor shafts"],
          en: ["Power rails", "Ground rods", "Motor shafts"],
        },
        correctIndex: 0,
      },
      {
        id: "ladder_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué es un contacto Normally Open (NO)?",
          en: "What is a Normally Open (NO) contact?",
        },
        options: {
          es: ["Cierra cuando se activa", "Siempre cerrado", "Nunca cambia"],
          en: ["Closes when activated", "Always closed", "Never changes"],
        },
        correctIndex: 0,
      },
      {
        id: "ladder_003",
        difficulty: "intermediate",
        prompt: {
          es: "En un esquema ladder, ¿qué suele representar una coil?",
          en: "In a ladder schematic, what does a coil typically represent?",
        },
        options: {
          es: ["Una salida o relé", "Una entrada analógica", "Un conduit body"],
          en: ["An output or relay", "An analog input", "A conduit body"],
        },
        correctIndex: 0,
      },
      {
        id: "ladder_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué te permite seguir un rung de izquierda a derecha?",
          en: "What does reading a rung from left to right allow you to understand?",
        },
        options: {
          es: ["La lógica de operación", "La ubicación física del motor", "El costo del material"],
          en: ["The operating logic", "The motor's physical location", "Material cost"],
        },
        correctIndex: 0,
      },
      {
        id: "ladder_005",
        difficulty: "advanced",
        prompt: {
          es: "Si una coil no energiza aunque una parte del rung está cerrada, ¿qué debes analizar?",
          en: "If a coil does not energize even though part of the rung is true, what should you analyze?",
        },
        options: {
          es: ["Toda la secuencia lógica del rung", "Solo el color del símbolo", "Solo el número de hoja"],
          en: ["The entire rung logic sequence", "Only the symbol color", "Only the sheet number"],
        },
        correctIndex: 0,
      },
      {
        id: "ladder_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué ventaja da poder leer esquemas y ladder bien en field troubleshooting?",
          en: "What advantage does being able to read schematics and ladder well give you in field troubleshooting?",
        },
        options: {
          es: ["Ubicar fallas más rápido y con menos suposiciones", "Eliminar la necesidad de medir", "Evitar usar E-stop"],
          en: ["Find faults faster with fewer assumptions", "Eliminate the need to measure", "Avoid using E-stop"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "branch-circuits",
    title: { es: "9. Branch Circuits", en: "9. Branch Circuits" },
    questions: [
      {
        id: "branch_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué es un branch circuit?",
          en: "What is a branch circuit?",
        },
        options: {
          es: ["Circuito desde el breaker hasta la carga", "Main service completo", "Sistema de tierra solamente"],
          en: ["Circuit from the breaker to the load", "Entire main service", "Only the grounding system"],
        },
        correctIndex: 0,
      },
      {
        id: "branch_002",
        difficulty: "basic",
        prompt: {
          es: "¿Amperaje típico de un circuito de iluminación?",
          en: "Typical lighting circuit amperage?",
        },
        options: {
          es: ["15–20A", "5A", "50A"],
          en: ["15–20A", "5A", "50A"],
        },
        correctIndex: 0,
      },
      {
        id: "branch_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué protege normalmente un branch circuit?",
          en: "What normally protects a branch circuit?",
        },
        options: {
          es: ["Breaker o fuse", "Transformer únicamente", "Sensor de presión"],
          en: ["Breaker or fuse", "Only a transformer", "Pressure sensor"],
        },
        correctIndex: 0,
      },
      {
        id: "branch_004",
        difficulty: "intermediate",
        prompt: {
          es: "Si agregas demasiada carga a un branch circuit, ¿qué puede ocurrir?",
          en: "If you add too much load to a branch circuit, what can happen?",
        },
        options: {
          es: ["Puede disparar la protección", "Baja el precio del cobre", "Mejora el factor de potencia automáticamente"],
          en: ["Protection may trip", "Copper price goes down", "It automatically improves power factor"],
        },
        correctIndex: 0,
      },
      {
        id: "branch_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué consideración técnica es importante al diseñar o instalar branch circuits largos?",
          en: "What technical consideration is important when designing or installing long branch circuits?",
        },
        options: {
          es: ["Voltage drop", "Color de la tapa", "Número de stickers en el panel"],
          en: ["Voltage drop", "Cover color", "Number of stickers on the panel"],
        },
        correctIndex: 0,
      },
      {
        id: "branch_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué es importante identificar claramente los branch circuits en panel schedules?",
          en: "Why is it important to clearly identify branch circuits in panel schedules?",
        },
        options: {
          es: ["Facilita operación y mantenimiento seguro", "Aumenta el voltaje", "Elimina necesidad de breaker"],
          en: ["It makes operation and maintenance safer and easier", "Raises voltage", "Eliminates the need for a breaker"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "switchgear",
    title: { es: "10. Switchgear", en: "10. Switchgear" },
    questions: [
      {
        id: "swg_001",
        difficulty: "basic",
        prompt: { es: "¿Qué es switchgear?", en: "What is switchgear?" },
        options: {
          es: ["Equipo para control y protección de potencia", "Método de doblado EMT", "Solo una luminaria"],
          en: ["Equipment for power control and protection", "An EMT bending method", "Only a light fixture"],
        },
        correctIndex: 0,
      },
      {
        id: "swg_002",
        difficulty: "basic",
        prompt: {
          es: "¿Dónde se usa comúnmente?",
          en: "Where is it commonly used?",
        },
        options: {
          es: ["Industrial y comercial", "Solo residencial liviano", "Solo en automóviles"],
          en: ["Industrial and commercial", "Only light residential", "Only in cars"],
        },
        correctIndex: 0,
      },
      {
        id: "swg_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué puede incluir un lineup de switchgear?",
          en: "What can a switchgear lineup include?",
        },
        options: {
          es: ["Breakers, disconnects y protección", "Solo cables THHN", "Solo cable trays"],
          en: ["Breakers, disconnects, and protection", "Only THHN cables", "Only cable trays"],
        },
        correctIndex: 0,
      },
      {
        id: "swg_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Por qué es importante el etiquetado claro en switchgear?",
          en: "Why is clear labeling important in switchgear?",
        },
        options: {
          es: ["Para operación y mantenimiento más seguro", "Para hacerlo ver más grande", "Para bajar amperaje"],
          en: ["For safer operation and maintenance", "To make it look bigger", "To lower amperage"],
        },
        correctIndex: 0,
      },
      {
        id: "swg_005",
        difficulty: "advanced",
        prompt: {
          es: "Al trabajar cerca de switchgear energizado, ¿qué tema de seguridad es especialmente crítico?",
          en: "When working near energized switchgear, what safety issue is especially critical?",
        },
        options: {
          es: ["Arc flash", "Color de las barras", "Número de puertas"],
          en: ["Arc flash", "Bus color", "Number of doors"],
        },
        correctIndex: 0,
      },
      {
        id: "swg_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué valor tiene comprender el one-line antes de intervenir un lineup de switchgear?",
          en: "What value is there in understanding the one-line before working on a switchgear lineup?",
        },
        options: {
          es: ["Entender cómo está distribuida la energía", "Saber el color del edificio", "Evitar usar instrumentos"],
          en: ["Understand how power is distributed", "Know the building color", "Avoid using instruments"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "cable-tray",
    title: { es: "11. Cable Tray", en: "11. Cable Tray" },
    questions: [
      {
        id: "tray_001",
        difficulty: "basic",
        prompt: {
          es: "¿Cuál es el propósito del cable tray?",
          en: "What is the purpose of cable tray?",
        },
        options: {
          es: ["Soportar cables", "Aterrizar todo el edificio", "Reemplazar breakers"],
          en: ["Support cables", "Ground the whole building", "Replace breakers"],
        },
        correctIndex: 0,
      },
      {
        id: "tray_002",
        difficulty: "basic",
        prompt: {
          es: "¿Puede reemplazar conduit en muchos casos industriales?",
          en: "Can it replace conduit in many industrial cases?",
        },
        options: {
          es: ["Sí", "No", "Solo bajo tierra"],
          en: ["Yes", "No", "Only underground"],
        },
        correctIndex: 0,
      },
      {
        id: "tray_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué factor es clave en la instalación de cable tray?",
          en: "What factor is key in cable tray installation?",
        },
        options: {
          es: ["Soporte y spacing correctos", "Color de pintura", "Edad del edificio"],
          en: ["Proper support and spacing", "Paint color", "Building age"],
        },
        correctIndex: 0,
      },
      {
        id: "tray_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Por qué importa la capacidad de llenado del tray?",
          en: "Why does tray fill capacity matter?",
        },
        options: {
          es: ["Para evitar sobreocupación y facilitar mantenimiento", "Para cambiar el voltaje", "Para eliminar soportes"],
          en: ["To avoid overcrowding and aid maintenance", "To change voltage", "To eliminate supports"],
        },
        correctIndex: 0,
      },
      {
        id: "tray_005",
        difficulty: "advanced",
        prompt: {
          es: "En tray installations, ¿qué problema puede generar un soporte deficiente?",
          en: "In tray installations, what problem can poor support create?",
        },
        options: {
          es: ["Deflexión o falla mecánica", "Mejor ventilación", "Menor peso del cable"],
          en: ["Deflection or mechanical failure", "Better ventilation", "Lower cable weight"],
        },
        correctIndex: 0,
      },
      {
        id: "tray_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué consideración adicional suele ser importante cuando diferentes tipos de cable comparten tray?",
          en: "What additional consideration is often important when different cable types share a tray?",
        },
        options: {
          es: ["Separación y orden según diseño y práctica", "Usar el mismo color siempre", "Reducir todos a baja tensión"],
          en: ["Separation and organization according to design and practice", "Always use the same color", "Reduce everything to low voltage"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "voltage-levels",
    title: { es: "12. Voltage Levels", en: "12. Voltage Levels" },
    questions: [
      {
        id: "volt_001",
        difficulty: "basic",
        prompt: {
          es: "¿Desde qué valor empieza medium voltage normalmente?",
          en: "At what value does medium voltage normally begin?",
        },
        options: {
          es: ["1000V+", "120V", "24V"],
          en: ["1000V+", "120V", "24V"],
        },
        correctIndex: 0,
      },
      {
        id: "volt_002",
        difficulty: "basic",
        prompt: {
          es: "¿Requisito clave de seguridad en medium voltage?",
          en: "Key safety requirement in medium voltage?",
        },
        options: {
          es: ["PPE especializado", "Solo guantes de trabajo comunes", "Ninguno especial"],
          en: ["Specialized PPE", "Only regular work gloves", "None"],
        },
        correctIndex: 0,
      },
      {
        id: "volt_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Es el trabajo de medium voltage igual al de low voltage?",
          en: "Is medium voltage work the same as low voltage work?",
        },
        options: {
          es: ["No, requiere procedimientos distintos", "Sí, es igual", "Solo cambia el color del cable"],
          en: ["No, it requires different procedures", "Yes, it is the same", "Only the cable color changes"],
        },
        correctIndex: 0,
      },
      {
        id: "volt_004",
        difficulty: "intermediate",
        prompt: {
          es: "Antes de tocar medium voltage equipment desenergizado, ¿qué verificación es crítica?",
          en: "Before touching de-energized medium voltage equipment, what verification is critical?",
        },
        options: {
          es: ["Ausencia de voltaje con procedimiento correcto", "Solo ver que el switch esté abajo", "Golpear el gabinete"],
          en: ["Verify absence of voltage with proper procedure", "Only see that the switch is down", "Hit the enclosure"],
        },
        correctIndex: 0,
      },
      {
        id: "volt_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué el aislamiento y terminaciones correctas son tan importantes en medium voltage?",
          en: "Why are proper insulation and terminations so important in medium voltage?",
        },
        options: {
          es: ["Porque una falla puede ser severa y destructiva", "Porque mejora el color del cable", "Porque elimina NEC"],
          en: ["Because a failure can be severe and destructive", "Because it improves cable color", "Because it eliminates NEC"],
        },
        correctIndex: 0,
      },
      {
        id: "volt_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué valor tiene respetar clearance y boundaries en trabajo de mayor voltaje?",
          en: "What is the value of respecting clearances and boundaries in higher-voltage work?",
        },
        options: {
          es: ["Reduce exposición al riesgo eléctrico", "Aumenta velocidad de instalación", "Reduce calibre del cable"],
          en: ["Reduce exposure to electrical risk", "Increase installation speed", "Reduce wire size"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "instrumentation",
    title: { es: "13. Instrumentation", en: "13. Instrumentation" },
    questions: [
      {
        id: "inst_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué es 4–20 mA?",
          en: "What is 4–20 mA?",
        },
        options: {
          es: ["Señal analógica estándar", "Frecuencia de motor", "Tipo de breaker"],
          en: ["A standard analog signal", "Motor frequency", "A breaker type"],
        },
        correctIndex: 0,
      },
      {
        id: "inst_002",
        difficulty: "basic",
        prompt: {
          es: "¿Qué hace instrumentation?",
          en: "What does instrumentation do?",
        },
        options: {
          es: ["Monitorea y controla procesos", "Solo alimenta luces", "Solo sirve para grounding"],
          en: ["Monitors and controls processes", "Only powers lights", "Only serves grounding"],
        },
        correctIndex: 0,
      },
      {
        id: "inst_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué mide un pressure sensor?",
          en: "What does a pressure sensor measure?",
        },
        options: {
          es: ["Presión", "Velocidad", "Amperaje del breaker"],
          en: ["Pressure", "Speed", "Breaker amperage"],
        },
        correctIndex: 0,
      },
      {
        id: "inst_004",
        difficulty: "intermediate",
        prompt: {
          es: "¿Qué ventaja tiene una señal 4–20 mA en industria?",
          en: "What is one advantage of a 4–20 mA signal in industry?",
        },
        options: {
          es: ["Es robusta para transmisión de proceso", "Elimina PLC", "No necesita calibración nunca"],
          en: ["It is robust for process transmission", "It eliminates the PLC", "It never needs calibration"],
        },
        correctIndex: 0,
      },
      {
        id: "inst_005",
        difficulty: "advanced",
        prompt: {
          es: "Si un transmisor 4–20 mA marca fuera de rango, ¿qué revisiones básicas son lógicas?",
          en: "If a 4–20 mA transmitter reads out of range, what basic checks are logical?",
        },
        options: {
          es: ["Loop power, wiring y calibración", "Color del panel", "Tamaño del conduit body"],
          en: ["Loop power, wiring, and calibration", "Panel color", "Conduit body size"],
        },
        correctIndex: 0,
      },
      {
        id: "inst_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué es importante entender P&ID o documentación de proceso al trabajar instrumentation?",
          en: "Why is it important to understand P&ID or process documentation when working in instrumentation?",
        },
        options: {
          es: ["Porque conecta el instrumento con la función del proceso", "Porque reemplaza el multímetro", "Porque muestra salarios"],
          en: ["Because it connects the instrument to the process function", "Because it replaces a multimeter", "Because it shows salaries"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "nec",
    title: { es: "14. NEC", en: "14. NEC" },
    questions: [
      {
        id: "nec_001",
        difficulty: "basic",
        prompt: {
          es: "¿Qué es NEC?",
          en: "What is the NEC?",
        },
        options: {
          es: ["Código eléctrico", "Una empresa", "Una herramienta"],
          en: ["Electrical code", "A company", "A tool"],
        },
        correctIndex: 0,
      },
      {
        id: "nec_002",
        difficulty: "basic",
        prompt: {
          es: "¿Por qué es importante?",
          en: "Why is it important?",
        },
        options: {
          es: ["Seguridad y cumplimiento", "Solo estética", "Solo estimados"],
          en: ["Safety and compliance", "Only aesthetics", "Only estimates"],
        },
        correctIndex: 0,
      },
      {
        id: "nec_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Cada cuánto se actualiza aproximadamente el NEC?",
          en: "How often is the NEC updated approximately?",
        },
        options: {
          es: ["Cada 3 años", "Cada 20 años", "Nunca"],
          en: ["Every 3 years", "Every 20 years", "Never"],
        },
        correctIndex: 0,
      },
      {
        id: "nec_004",
        difficulty: "intermediate",
        prompt: {
          es: "Si tienes duda en una instalación, ¿qué es mejor hacer?",
          en: "If you have a question about an installation, what is the better approach?",
        },
        options: {
          es: ["Revisar código y documentación aplicable", "Asumir que todo está bien", "Copiar cualquier instalación vieja"],
          en: ["Review the applicable code and documentation", "Assume everything is fine", "Copy any old installation"],
        },
        correctIndex: 0,
      },
      {
        id: "nec_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Qué demuestra mejor criterio profesional respecto al NEC en campo?",
          en: "What best demonstrates professional judgment regarding the NEC in the field?",
        },
        options: {
          es: ["Saber cuándo consultar el código y cómo aplicarlo", "Memorizar solo una tabla", "Ignorarlo si el trabajo va rápido"],
          en: ["Knowing when to consult the code and how to apply it", "Memorizing only one table", "Ignoring it if the job is moving fast"],
        },
        correctIndex: 0,
      },
      {
        id: "nec_006",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué no siempre basta con “así lo hemos hecho antes”?",
          en: "Why is 'we've always done it this way' not always enough?",
        },
        options: {
          es: ["Porque el código y las condiciones pueden cambiar", "Porque el cobre ya no existe", "Porque elimina permisos"],
          en: ["Because the code and conditions can change", "Because copper no longer exists", "Because it eliminates permits"],
        },
        correctIndex: 0,
      },
    ],
  },
  {
    id: "electrical-math",
    title: { es: "15. Electrical Math", en: "15. Electrical Math" },
    questions: [
      {
        id: "math_001",
        difficulty: "basic",
        prompt: {
          es: "¿Fórmula de potencia?",
          en: "Power formula?",
        },
        options: {
          es: ["P = V × I", "P = I / V", "P = R × I × I × I"],
          en: ["P = V × I", "P = I / V", "P = R × I × I × I"],
        },
        correctIndex: 0,
      },
      {
        id: "math_002",
        difficulty: "basic",
        prompt: {
          es: "120V × 10A = ?",
          en: "120V × 10A = ?",
        },
        options: {
          es: ["1200W", "120W", "12W"],
          en: ["1200W", "120W", "12W"],
        },
        correctIndex: 0,
      },
      {
        id: "math_003",
        difficulty: "intermediate",
        prompt: {
          es: "¿Ohm’s Law?",
          en: "Ohm’s Law?",
        },
        options: {
          es: ["V = I × R", "V = P × I", "R = V × I"],
          en: ["V = I × R", "V = P × I", "R = V × I"],
        },
        correctIndex: 0,
      },
      {
        id: "math_004",
        difficulty: "intermediate",
        prompt: {
          es: "Si una carga consume 5A a 240V, ¿cuánta potencia aproximada usa?",
          en: "If a load draws 5A at 240V, about how much power does it use?",
        },
        options: {
          es: ["1200W", "240W", "48W"],
          en: ["1200W", "240W", "48W"],
        },
        correctIndex: 0,
      },
      {
        id: "math_005",
        difficulty: "advanced",
        prompt: {
          es: "¿Por qué es importante poder hacer math básica en field?",
          en: "Why is it important to be able to do basic electrical math in the field?",
        },
        options: {
          es: ["Para verificar cargas, corriente y decisiones de instalación", "Solo para llenar resumes", "Porque reemplaza el código"],
          en: ["To verify loads, current, and installation decisions", "Only to fill out resumes", "Because it replaces code"],
        },
        correctIndex: 0,
      },
      {
        id: "math_006",
        difficulty: "advanced",
        prompt: {
          es: "En circuitos reales, ¿qué otra consideración matemática suele importar además de potencia simple?",
          en: "In real circuits, what other mathematical consideration often matters besides simple power?",
        },
        options: {
          es: ["Voltage drop", "Color de cable", "Nombre del proyecto"],
          en: ["Voltage drop", "Wire color", "Project name"],
        },
        correctIndex: 0,
      },
    ],
  },
];