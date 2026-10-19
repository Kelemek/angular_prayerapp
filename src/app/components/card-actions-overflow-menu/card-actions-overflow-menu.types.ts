export type CardActionsOverflowActionId =
  | 'reminder'
  | 'answered'
  | 'edit'
  | 'delete'
  | 'members';

export type CardActionsOverflowIcon = 'bell' | 'check' | 'edit' | 'trash' | 'users';

export type CardActionsOverflowTone = 'blue' | 'green' | 'gray' | 'red';

export interface CardActionsOverflowItem {
  id: CardActionsOverflowActionId;
  label: string;
  icon: CardActionsOverflowIcon;
  tone: CardActionsOverflowTone;
  onSelect: () => void;
  ariaLabel?: string;
  tourAnchorId?: string | null;
  filled?: boolean;
}
