"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

interface ExamQuestion {
  question: string;
  options: string[];
  marks: number;
}

interface ExamData {
  questions: ExamQuestion[];
  duration: number;
  startedAt: string;
  totalMarks: number;
}

interface ExamResult {
  score: number;
  totalMarks: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  passed: boolean;
  status: string;
}

export default function TakeExamPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const submitExam = useCallback(
    async (isAutoSubmit = false) => {
      if (submitting || result) return;
      if (!isAutoSubmit) {
        const confirmed = await showConfirm(
          "Submit Exam",
          `You have answered ${Object.keys(answers).length} of ${examData?.questions.length || 0} questions. Submit now?`,
        );
        if (!confirmed) return;
      }

      setSubmitting(true);
      try {
        const answersArray = Object.entries(answers).map(
          ([qIdx, selectedOption]) => ({
            questionIndex: Number(qIdx),
            selectedOption,
          }),
        );

        const res = await fetch(`/api/online-exams/${examId}/attempt`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: session?.user?.id,
            answers: answersArray,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setResult(data.data);
          if (timerRef.current) clearInterval(timerRef.current);
          if (!isAutoSubmit) {
            showSuccess("Submitted!", "Your exam has been submitted.");
          }
        } else {
          showError("Error", data.error || "Failed to submit exam");
        }
      } catch {
        showError("Error", "Failed to submit exam");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, result, answers, examData, examId, session],
  );

  // Start exam
  useEffect(() => {
    async function startExam() {
      try {
        setLoading(true);
        const res = await fetch(`/api/online-exams/${examId}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: session?.user?.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setExamData(data.data);
          const startedAt = new Date(data.data.startedAt).getTime();
          const durationMs = data.data.duration * 60 * 1000;
          const remaining = Math.max(
            0,
            Math.floor((startedAt + durationMs - Date.now()) / 1000),
          );
          setTimeLeft(remaining);
        } else {
          setError(data.error || "Failed to start exam");
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) startExam();
  }, [examId, session]);

  // Timer countdown
  useEffect(() => {
    if (!examData || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examData, result, submitExam]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const selectAnswer = (questionIdx: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Cannot Start Exam</h2>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/online-exams">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mb-4">
              {result.passed ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              ) : (
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {result.status === "timed-out" ? "Time's Up!" : "Exam Submitted!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.score !== undefined ? (
              <>
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {result.score}/{result.totalMarks}
                  </p>
                  <Badge
                    className={`mt-2 ${result.passed ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}
                  >
                    {result.passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {result.totalCorrect}
                    </p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <p className="font-bold text-red-600 dark:text-red-400">
                      {result.totalWrong}
                    </p>
                    <p className="text-xs text-muted-foreground">Wrong</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <p className="font-bold text-gray-600 dark:text-gray-400">
                      {result.totalUnanswered}
                    </p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                Your exam has been submitted. Results will be available later.
              </p>
            )}
            <Link href="/online-exams" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examData) return null;

  const question = examData.questions[currentQuestion];
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeLeft < 300; // < 5 min

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Bar — Timer + Progress */}
      <div className="sticky top-16 z-20 bg-background border-b pb-3 pt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/online-exams">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Badge variant="secondary">
              Q {currentQuestion + 1}/{totalQuestions}
            </Badge>
            <Badge variant="outline">
              {answeredCount}/{totalQuestions} answered
            </Badge>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${
              isUrgent
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 animate-pulse"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Question {currentQuestion + 1}
            </CardTitle>
            <Badge variant="outline">{question.marks} mark(s)</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((opt, idx) => {
              const isSelected = answers[currentQuestion] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(currentQuestion, idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={isSelected ? "font-medium" : ""}>
                      {opt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion((p) => p - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestion < totalQuestions - 1 ? (
            <Button onClick={() => setCurrentQuestion((p) => p + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => submitExam(false)}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Question Navigator
          </p>
          <div className="flex flex-wrap gap-2">
            {examData.questions.map((_, idx) => {
              const isAnswered = answers[idx] !== undefined;
              const isCurrent = currentQuestion === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white ring-2 ring-blue-300"
                      : isAnswered
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900 inline-block" />{" "}
              Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 inline-block" />{" "}
              Unanswered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-600 inline-block" />{" "}
              Current
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
