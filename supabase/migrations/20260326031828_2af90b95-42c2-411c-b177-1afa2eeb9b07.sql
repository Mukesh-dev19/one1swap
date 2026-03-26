-- Remove duplicate requests so each user can only request a resource once
WITH ranked_requests AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY resource_id, user_id
           ORDER BY created_at ASC, id ASC
         ) AS row_num
  FROM public.resource_requests
)
DELETE FROM public.resource_requests
WHERE id IN (
  SELECT id
  FROM ranked_requests
  WHERE row_num > 1
);

-- Enforce one request per user per resource
ALTER TABLE public.resource_requests
ADD CONSTRAINT resource_requests_resource_user_unique UNIQUE (resource_id, user_id);