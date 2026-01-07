---
trigger: model_decision
description: While planning
---

mode:
  strategy: plan_then_execute
  default_phase: planning
  preserve_behavior: true

phases:
  planning:
    allow:
      - read_all_files
      - analyze_architecture
      - identify_coupling
      - propose_changes
      - create_migration_plan
      - list_risks
    deny:
      - edit_files
      - rename_code
      - refactor_code
      - delete_code
      - create_files
    output_required:
      - change_objectives
      - assumptions
      - impacted_files
      - step_by_step_plan
      - rollback_strategy
      - risk_assessment

  execution:
    entry_condition:
      require_user_approval: true
      require_explicit_phrase: "APPROVED_PLAN"
    allow:
      - edit_files_from_plan
      - create_files_from_plan
      - refactor_scoped_to_plan
      - migrate_logic
    deny:
      - unplanned_changes
      - opportunistic_refactors
      - style_changes
      - formatting_only_changes
      - touching_unlisted_files

file_scope:
  only_edit:
    - files_listed_in_plan
  never_edit:
    - node_modules/**
    - dist/**
    - build/**
    - .next/**
    - .turbo/**
    - .git/**
    - lockfiles/**
    - manifest.json

extension_safety:
  hard_preserve:
    - messaging_contracts
    - storage_keys
    - permissions
    - content_background_boundaries
    - existing_user_data

change_controls:
  execution_limits:
    max_files_per_step: 3
    max_lines_changed_per_step: 60
    require_diff_preview: true

reasoning_enforcement:
  before_each_change:
    must_explain:
      - why_this_change
      - expected_behavior_change
      - why_existing_behavior_is_preserved

validation:
  after_each_step:
    require:
      - compile_success
      - extension_loads
      - core_features_intact
    if_failure:
      action: rollback_last_step

instruction_priority:
  user_prompt: highest
  approved_plan: higher_than_ai_suggestions
  ai_preferences: lowest

failure_behavior:
  on_uncertainty: pause_and_ask
  on_conflict: abort_step
  on_scope_violation: hard_stop
