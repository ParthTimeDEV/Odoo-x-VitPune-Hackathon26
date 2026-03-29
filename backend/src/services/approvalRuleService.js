const pool = require("../db/pool");
const { createHttpError } = require("../middleware/errorHandler");

async function listApprovalRules(companyId, categoryId = null) {
  let query = `
    SELECT ar.id, ar.company_id, ar.category_id, ec.name AS category_name,
           ar.name, ar.is_manager_first, ar.condition_mode, ar.percentage_threshold,
           ar.specific_approver_id, su.email AS specific_approver_email,
           COALESCE(step_counts.step_count, 0)::INTEGER AS step_count,
           ar.created_at
    FROM approval_rules ar
    LEFT JOIN expense_categories ec ON ec.id = ar.category_id
    LEFT JOIN users su ON su.id = ar.specific_approver_id
    LEFT JOIN (
      SELECT rule_id, COUNT(*) AS step_count
      FROM approval_rule_steps
      GROUP BY rule_id
    ) step_counts ON step_counts.rule_id = ar.id
    WHERE ar.company_id = $1
  `;
  const params = [companyId];

  if (categoryId) {
    query += ` AND ar.category_id = $2`;
    params.push(categoryId);
  }

  query += ` ORDER BY ar.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

async function getRuleWithSteps(ruleId, companyId) {
  const ruleResult = await pool.query(
    `SELECT ar.id, ar.company_id, ar.category_id, ec.name AS category_name,
            ar.name, ar.is_manager_first, ar.condition_mode, ar.percentage_threshold,
            ar.specific_approver_id, su.email AS specific_approver_email,
            ar.created_at
     FROM approval_rules ar
     LEFT JOIN expense_categories ec ON ec.id = ar.category_id
     LEFT JOIN users su ON su.id = ar.specific_approver_id
     WHERE ar.id = $1 AND ar.company_id = $2`,
    [ruleId, companyId]
  );

  if (!ruleResult.rows[0]) {
    throw createHttpError("Rule not found in your company", 404);
  }

  const rule = ruleResult.rows[0];

  const stepsResult = await pool.query(
    `SELECT id, rule_id, approver_user_id, step_order
     FROM approval_rule_steps
     WHERE rule_id = $1
     ORDER BY step_order ASC`,
    [ruleId]
  );

  return { ...rule, steps: stepsResult.rows };
}

async function createApprovalRule(companyId, payload) {
  const {
    categoryId,
    name,
    isManagerFirst,
    conditionMode,
    percentageThreshold,
    specificApproverId,
    approverIds
  } = payload;

  if (!name || !conditionMode) {
    throw createHttpError("name and conditionMode are required", 400);
  }

  if (!["sequential", "percentage", "specific_user", "hybrid"].includes(conditionMode)) {
    throw createHttpError("conditionMode must be sequential, percentage, specific_user or hybrid", 400);
  }

  if (["percentage", "hybrid"].includes(conditionMode) && !percentageThreshold) {
    throw createHttpError("percentageThreshold is required for percentage/hybrid mode", 400);
  }

  if (["specific_user", "hybrid"].includes(conditionMode) && !specificApproverId) {
    throw createHttpError("specificApproverId is required for specific_user/hybrid mode", 400);
  }

  if (!Array.isArray(approverIds) || approverIds.length === 0) {
    throw createHttpError("approverIds must be a non-empty array", 400);
  }

  const approverIdSet = new Set(approverIds.map(Number));
  if (specificApproverId) {
    approverIdSet.add(Number(specificApproverId));
  }

  if (categoryId) {
    const catResult = await pool.query(
      `SELECT id FROM expense_categories WHERE id = $1 AND company_id = $2`,
      [categoryId, companyId]
    );
    if (!catResult.rows[0]) {
      throw createHttpError("Invalid category for your company", 400);
    }
  }

  const approverResult = await pool.query(
    `SELECT id FROM users WHERE company_id = $1 AND id = ANY($2) AND role IN ('manager', 'admin')`,
    [companyId, Array.from(approverIdSet)]
  );

  if (approverResult.rows.length !== approverIdSet.size) {
    throw createHttpError("Some approvers not found or are not managers/admins", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ruleResult = await client.query(
      `INSERT INTO approval_rules (
         company_id,
         category_id,
         name,
         is_manager_first,
         condition_mode,
         percentage_threshold,
         specific_approver_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_id, category_id, name, is_manager_first, condition_mode, percentage_threshold, specific_approver_id, created_at`,
      [
        companyId,
        categoryId || null,
        name,
        isManagerFirst || false,
        conditionMode,
        percentageThreshold || null,
        specificApproverId || null
      ]
    );

    const rule = ruleResult.rows[0];

    for (let i = 0; i < approverIds.length; i++) {
      await client.query(
        `INSERT INTO approval_rule_steps (rule_id, approver_user_id, step_order)
         VALUES ($1, $2, $3)`,
        [rule.id, approverIds[i], i]
      );
    }

    await client.query("COMMIT");

    const fullRule = await getRuleWithSteps(rule.id, companyId);
    return fullRule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateApprovalRule(companyId, ruleId, payload) {
  const { name, isManagerFirst, percentageThreshold, specificApproverId, approverIds } = payload;

  await getRuleWithSteps(ruleId, companyId);

  if (!Array.isArray(approverIds) || approverIds.length === 0) {
    throw createHttpError("approverIds must be a non-empty array", 400);
  }

  const approverIdSet = new Set(approverIds.map(Number));
  if (specificApproverId) {
    approverIdSet.add(Number(specificApproverId));
  }

  const approverResult = await pool.query(
    `SELECT id FROM users WHERE company_id = $1 AND id = ANY($2) AND role IN ('manager', 'admin')`,
    [companyId, Array.from(approverIdSet)]
  );

  if (approverResult.rows.length !== approverIdSet.size) {
    throw createHttpError("Some approvers not found or are not managers/admins", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE approval_rules
       SET name = COALESCE($1, name),
           is_manager_first = COALESCE($2, is_manager_first),
           percentage_threshold = COALESCE($3, percentage_threshold),
           specific_approver_id = COALESCE($4, specific_approver_id)
       WHERE id = $5`,
      [
        name || null,
        isManagerFirst !== undefined ? isManagerFirst : null,
        percentageThreshold || null,
        specificApproverId || null,
        ruleId
      ]
    );

    await client.query(`DELETE FROM approval_rule_steps WHERE rule_id = $1`, [ruleId]);

    for (let i = 0; i < approverIds.length; i++) {
      await client.query(
        `INSERT INTO approval_rule_steps (rule_id, approver_user_id, step_order)
         VALUES ($1, $2, $3)`,
        [ruleId, approverIds[i], i]
      );
    }

    await client.query("COMMIT");

    const fullRule = await getRuleWithSteps(ruleId, companyId);
    return fullRule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteApprovalRule(companyId, ruleId) {
  const result = await pool.query(
    `DELETE FROM approval_rules WHERE id = $1 AND company_id = $2`,
    [ruleId, companyId]
  );

  if (result.rowCount === 0) {
    throw createHttpError("Rule not found in your company", 404);
  }

  return { success: true };
}

module.exports = {
  listApprovalRules,
  getRuleWithSteps,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule
};
