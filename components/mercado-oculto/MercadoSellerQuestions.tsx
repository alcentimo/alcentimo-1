"use client";

import { useEffect, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";

const STORAGE_PREFIX = "alcentimo-mercado-questions-v1:";

type Question = {
  id: string;
  text: string;
  askedAt: string;
  answer: string | null;
  answeredAt: string | null;
};

function loadQuestions(productId: string): Question[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + productId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Question[]) : [];
  } catch {
    return [];
  }
}

function saveQuestions(productId: string, questions: Question[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    STORAGE_PREFIX + productId,
    JSON.stringify(questions),
  );
}

function buildAutoReply(supplierLabel: string) {
  return `Gracias por tu pregunta. Como ${supplierLabel} te responderemos a la brevedad con disponibilidad, precios por volumen y condiciones de envío.`;
}

interface MercadoSellerQuestionsProps {
  productId: string;
  productName: string;
  supplierLabel?: string;
}

export function MercadoSellerQuestions({
  productId,
  productName,
  supplierLabel = "Mayorista Oficial Alcéntimo",
}: MercadoSellerQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setQuestions(loadQuestions(productId));
    setReady(true);
  }, [productId]);

  function submitQuestion(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const question: Question = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      askedAt: now,
      answer: null,
      answeredAt: null,
    };

    const withPending = [question, ...questions];
    setQuestions(withPending);
    saveQuestions(productId, withPending);
    setDraft("");

    window.setTimeout(() => {
      const answered: Question = {
        ...question,
        answer: buildAutoReply(supplierLabel),
        answeredAt: new Date().toISOString(),
      };
      setQuestions((prev) => {
        const next = prev.map((item) =>
          item.id === question.id ? answered : item,
        );
        saveQuestions(productId, next);
        return next;
      });
    }, 900);
  }

  return (
    <section className="mercado-ml-questions" aria-labelledby="preguntas-vendedor">
      <div className="mercado-ml-questions-head">
        <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
        <div>
          <h2 id="preguntas-vendedor">Preguntas al vendedor</h2>
          <p>
            Consultá a {supplierLabel} sobre «{productName}». Las respuestas se
            simulan en esta sesión para el Super Admin.
          </p>
        </div>
      </div>

      <form className="mercado-ml-questions-form" onSubmit={submitQuestion}>
        <label htmlFor={`ask-${productId}`} className="sr-only">
          Escribir pregunta
        </label>
        <textarea
          id={`ask-${productId}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ej.: ¿Cuál es el mínimo de compra y el lead time?"
          rows={3}
          maxLength={500}
        />
        <button type="submit" className="mercado-ml-btn-primary" disabled={!draft.trim()}>
          Preguntar
        </button>
      </form>

      {!ready ? (
        <p className="text-sm text-zinc-500">Cargando preguntas…</p>
      ) : questions.length === 0 ? (
        <p className="mercado-ml-questions-empty">
          Todavía no hay preguntas. Sé el primero en consultar al mayorista.
        </p>
      ) : (
        <ul className="mercado-ml-questions-list">
          {questions.map((item) => (
            <li key={item.id}>
              <p className="mercado-ml-q">{item.text}</p>
              {item.answer ? (
                <p className="mercado-ml-a">
                  <span>Respuesta del mayorista:</span> {item.answer}
                </p>
              ) : (
                <p className="mercado-ml-a-pending">Esperando respuesta…</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
