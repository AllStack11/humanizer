import { Switch } from "./AppUI.jsx";

export default function ToggleSwitch({ value, onChange }) {
  return (
    <Switch
      isSelected={value}
      onChange={(next) => {
        if (typeof next === "boolean") {
          onChange(next);
          return;
        }
        onChange(Boolean(next?.target?.checked));
      }}
      aria-label="Toggle AI filter"
    />
  );
}
