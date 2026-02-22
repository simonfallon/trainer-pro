"use client";

import { useState, useRef, useEffect } from "react";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { exerciseTemplatesApi } from "@/lib/api";
import type { ExerciseTemplate } from "@/types";

interface ExerciseAutocompleteProps {
  appId: number;
  value: string;
  onChange: (value: string) => void;
  onSelect: (template: ExerciseTemplate) => void;
  placeholder?: string;
  required?: boolean;
}

export function ExerciseAutocomplete({
  appId,
  value,
  onChange,
  onSelect,
  placeholder = "Empieza a escribir para buscar ejercicios...",
  required = false,
}: ExerciseAutocompleteProps) {
  const { theme } = useDarkStyles();
  const [suggestions, setSuggestions] = useState<ExerciseTemplate[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearch = async (query: string) => {
    onChange(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await exerciseTemplatesApi.autocomplete(appId, query, 1000);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching autocomplete suggestions:", err);
      }
    }, 300);
  };

  const handleSelect = (template: ExerciseTemplate) => {
    onSelect(template);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const showDropdown = showSuggestions && suggestions.length > 0;

  return (
    <div
      style={{
        position: "relative",
        marginBottom: showDropdown ? "240px" : "0",
        transition: "margin-bottom 0.2s ease-out",
      }}
    >
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => handleSearch(value)}
        onBlur={() => {
          setTimeout(() => {
            setShowSuggestions(false);
          }, 200);
        }}
        placeholder={placeholder}
        required={required}
        style={{ fontSize: "0.875rem" }}
      />

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.secondary}30`,
            borderRadius: "4px",
            marginTop: "0.25rem",
            maxHeight: "240px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
          }}
        >
          {suggestions.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelect(template)}
              style={{
                padding: "0.75rem",
                cursor: "pointer",
                borderBottom: `1px solid ${theme.colors.secondary}20`,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.colors.primary}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: theme.colors.text,
                  fontSize: "0.875rem",
                }}
              >
                {template.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
