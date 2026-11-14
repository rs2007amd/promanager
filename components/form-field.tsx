type Option = string | { value: string; label: string };

type Props = {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  errors?: string[];
  options?: readonly Option[];
  required?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  step,
  defaultValue,
  errors,
  options,
  required = true,
}: Props) {
  const id = `field-${name}`;
  const className = "w-full rounded border p-2";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {options ? (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          required={required}
          className={className}
        >
          {options.map((o) => {
            const value = typeof o === "string" ? o : o.value;
            const text = typeof o === "string" ? o : o.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          step={step}
          defaultValue={defaultValue}
          required={required}
          className={className}
        />
      )}
      {errors?.map((e) => (
        <p key={e} className="text-sm text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}
