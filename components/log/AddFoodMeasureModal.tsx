import { ChoiceModal } from '@/components/profile/choice-modal';

type MeasureOption = 'grams' | 'oz' | 'servings';

type AddFoodMeasureModalProps = {
  open: boolean;
  selected: MeasureOption;
  onClose: () => void;
  onSelect: (value: MeasureOption) => void;
};

const MEASURE_OPTIONS: MeasureOption[] = ['grams', 'oz', 'servings'];

export function AddFoodMeasureModal({
  open,
  selected,
  onClose,
  onSelect,
}: AddFoodMeasureModalProps) {
  return (
    <ChoiceModal
      title="Choose Measure"
      open={open}
      options={MEASURE_OPTIONS}
      selected={selected}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}

