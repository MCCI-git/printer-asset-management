<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\PrintPlan;
use App\Models\PrintPurchase;
use App\Models\PrintStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class PrintManagerController extends Controller
{
    // ── Plans ────────────────────────────────────────────────────────

    public function plans(): JsonResponse
    {
        return response()->json(PrintPlan::orderBy('pages')->get());
    }

    public function updatePlan(Request $request, int $id): JsonResponse
    {
        $plan = PrintPlan::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'price' => 'required|numeric|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $plan->update(['price' => $request->input('price')]);
        return response()->json($plan);
    }

    // ── Students ────────────────────────────────────────────────────

    public function students(): JsonResponse
    {
        $students = PrintStudent::with(['plan', 'purchases.plan'])
            ->orderBy('name')
            ->get()
            ->map(fn($s) => $this->formatStudent($s));

        return response()->json($students);
    }

    public function storeStudent(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|max:255',
            'plan_id'    => 'nullable|exists:print_plans,id',
            'printer_id' => 'nullable|string|max:50|unique:print_students,printer_id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $essentialPlan = PrintPlan::where('label', 'Essential')->first();
        $planId = $request->input('plan_id') ?? $essentialPlan?->id;

        $student = PrintStudent::create([
            ...$request->only('name', 'email', 'printer_id'),
            'plan_id' => $planId,
        ]);
        if ($essentialPlan) {
            PrintPurchase::create([
                'student_id'   => $student->id,
                'plan_id'      => $essentialPlan->id,
                'price'        => $essentialPlan->price,
                'type'         => 'purchase',
                'purchased_at' => now(),
            ]);
        }

        $student->load(['plan', 'purchases.plan']);
        return response()->json($this->formatStudent($student), 201);
    }

    public function updateStudent(Request $request, int $id): JsonResponse
    {
        $student = PrintStudent::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'name'       => 'sometimes|required|string|max:255',
            'email'      => 'sometimes|required|email|max:255',
            'plan_id'    => 'sometimes|required|exists:print_plans,id',
            'printer_id' => 'nullable|string|max:50|unique:print_students,printer_id,' . $id,
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $student->update($request->only('name', 'email', 'plan_id', 'printer_id'));
        $student->load(['plan', 'purchases.plan']);
        return response()->json($this->formatStudent($student));
    }

    public function deleteStudent(int $id): JsonResponse
    {
        PrintStudent::findOrFail($id)->delete();
        return response()->json(['message' => 'Student deleted.']);
    }

    public function deletePurchase(int $id): JsonResponse
    {
        $purchase = PrintPurchase::with('plan')->findOrFail($id);

        if ($purchase->type === 'purchase' && $purchase->price == 0) {
            return response()->json(['message' => 'Free plan entries cannot be deleted.'], 403);
        }

        $student  = PrintStudent::findOrFail($purchase->student_id);
        $purchase->delete();

        $lastPurchase = PrintPurchase::where('student_id', $student->id)
            ->where('type', 'purchase')
            ->orderBy('purchased_at', 'desc')
            ->first();

        if ($lastPurchase) {
            $student->update(['plan_id' => $lastPurchase->plan_id]);
        }

        $student->refresh()->load(['plan', 'purchases.plan']);
        return response()->json($this->formatStudent($student));
    }

    // ── Purchases ────────────────────────────────────────────────────

    public function logPurchase(Request $request, int $studentId): JsonResponse
    {
        $student = PrintStudent::findOrFail($studentId);
        $validator = Validator::make($request->all(), [
            'plan_id'      => 'required|exists:print_plans,id',
            'purchased_at' => 'required|date',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $plan = PrintPlan::findOrFail($request->input('plan_id'));
        PrintPurchase::create([
            'student_id'   => $student->id,
            'plan_id'      => $plan->id,
            'price'        => $plan->price,
            'type'         => 'purchase',
            'purchased_at' => $request->input('purchased_at'),
        ]);
        $student->update(['plan_id' => $plan->id]);
        $student->load(['plan', 'purchases.plan']);
        return response()->json($this->formatStudent($student));
    }

    // ── Email ────────────────────────────────────────────────────────

    public function sendEmail(Request $request, int $studentId): JsonResponse
    {
        $student = PrintStudent::with('plan')->findOrFail($studentId);
        $validator = Validator::make($request->all(), [
            'subject' => 'required|string',
            'body'    => 'required|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $esc = fn(string $v) => htmlspecialchars($v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $compiledBody = str_replace(
            ['[STUDENT_NAME]', '[PRINTER_ID]', '[PLAN_NAME]'],
            [
                $esc($student->name),
                $esc($student->printer_id ?? 'Not assigned'),
                $esc($student->plan->label),
            ],
            $request->input('body')
        );

        try {
            Mail::html($compiledBody, function ($message) use ($student, $request) {
                $message->to($student->email, $student->name)
                        ->subject($request->input('subject'));
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Mail error: ' . $e->getMessage()], 500);
        }

        // Log email in history
        $plan = PrintPlan::first();
        PrintPurchase::create([
            'student_id'   => $student->id,
            'plan_id'      => $student->plan_id,
            'price'        => 0,
            'type'         => 'email',
            'purchased_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => "Email sent to {$student->email}."]);
    }

    // ── Email Template ───────────────────────────────────────────────

    public function getEmailTemplate(): JsonResponse
    {
        return response()->json(['template' => AppSetting::get('email_template')]);
    }

    public function saveEmailTemplate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'template' => 'required|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        AppSetting::set('email_template', $request->input('template'));
        return response()->json(['success' => true]);
    }

    // ── Budget ────────────────────────────────────────────────────────

    public function budget(): JsonResponse
    {
        $plans = PrintPlan::with(['purchases' => fn($q) => $q->where('type', 'purchase')])->orderBy('pages')->get();

        $totalIncome = 0;
        $rows = $plans->map(function ($plan) use (&$totalIncome) {
            $isFree = $plan->price == 0;
            $income = $isFree ? 0 : $plan->purchases->sum('price');
            $totalIncome += $income;
            return [
                'id'              => $plan->id,
                'label'           => $plan->label,
                'pages'           => $plan->pages,
                'price'           => $plan->price,
                'is_free'         => $isFree,
                'total_purchases' => $plan->purchases->count(),
                'income'          => $income,
            ];
        });

        return response()->json([
            'total_income' => $totalIncome,
            'plans'        => $rows,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function formatStudent(PrintStudent $s): array
    {
        $purchases = $s->purchases->sortBy('purchased_at')->values();
        return [
            'id'             => $s->id,
            'printer_id'     => $s->printer_id,
            'name'           => $s->name,
            'email'          => $s->email,
            'plan_id'        => $s->plan_id,
            'plan_label'     => $s->plan->label ?? '',
            'purchase_count' => $purchases->where('type', 'purchase')->count(),
            'history'        => $purchases->map(fn($p) => [
                'id'           => $p->id,
                'plan'         => $p->plan->label ?? '',
                'price'        => $p->price,
                'type'         => $p->type,
                'purchased_at' => $p->purchased_at?->format('Y-m-d H:i'),
            ])->values(),
        ];
    }
}
