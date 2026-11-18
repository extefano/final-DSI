export type ExerciseType = 'cloze' | 'puzzle_grid' | 'puzzle_diagram';

export interface ClozeExercise {
  id: string;
  type: 'cloze';
  topic: string;
  template: string;
  distractors: string[];
  explanation?: string;
}

export type GridDiagramKind =
  | 'pressman_layers'
  | 'waterfall_model'
  | 'boehm_spiral'
  | 'iterative_up'
  | 'morville_ux'
  | 'uml_views_4plus1'
  | 'clean_architecture'
  | 'scrum_cycle'
  | 'iso25010_quality';

export interface PuzzleGridExercise {
  id: string;
  type: 'puzzle_grid';
  topic: string;
  image: string;
  diagramKind?: GridDiagramKind;
  cols: number;
  rows: number;
  caption: string;
  tileLabels?: string[];
  explanation?: string;
}

export type DiagramTemplateId =
  | 'uml_relations'
  | 'bce_stereotypes'
  | 'pressman_layers'
  | 'boehm_quadrants'
  | 'morville_honeycomb'
  | 'solid_principles'
  | 'grasp_roles'
  | 'arch_styles'
  | 'gof_matrix'
  | 'scrum_artifacts'
  | 'quality_mccall_iso';

export interface DiagramSlot {
  id: string;
  label: string;
  correctPiece: string;
  hint?: string;
}

export interface PuzzleDiagramExercise {
  id: string;
  type: 'puzzle_diagram';
  topic: string;
  svgTemplate: DiagramTemplateId;
  caption?: string;
  slots: DiagramSlot[];
  distractors: string[];
  explanation?: string;
}

export type Exercise = ClozeExercise | PuzzleGridExercise | PuzzleDiagramExercise;

export interface UnitData {
  unitId: string;
  title: string;
  subtitle?: string;
  exercises: Exercise[];
}

export interface UnitCatalogItem {
  unitId: string;
  code: string;
  title: string;
  subtitle: string;
  term: '1er Cuatrimestre' | '2do Cuatrimestre' | 'Transversal';
  pdfPages: string;
  file: string;
  exerciseCount: number;
  accentColor: 'emerald' | 'blue' | 'amber' | 'violet' | 'rose' | 'teal';
}

export interface CatalogIndex {
  courseTitle: string;
  sourceDocument: string;
  units: UnitCatalogItem[];
}

export type ThemeMode = 'light' | 'dark';

export interface ProgressState {
  completedIds: string[];
  /** Map from exerciseId -> consecutive correct count in review queue (0 or 1; 2 removes it) */
  reviewQueue: Record<string, number>;
  streak: number;
  bestStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  lastUpdated: number;
}

export interface ExerciseResult {
  isCorrect: boolean;
  summary: string;
}
