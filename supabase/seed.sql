BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $seed$
DECLARE
  v_user_id UUID;
  v_account_id UUID := '10000000-0000-4000-8000-000000000001'::uuid;
  v_property_id UUID := '20000000-0000-4000-8000-000000000001'::uuid;
  v_team_member_id UUID := '11000000-0000-4000-8000-000000000001'::uuid;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_base_month DATE := (date_trunc('month', NOW()) - interval '7 months')::date;
BEGIN
  INSERT INTO users (
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    'microsaas.farm@gmail.com',
    'MicroSaaS',
    'Farm',
    NOW() - interval '180 days',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  INSERT INTO accounts (
    id,
    name,
    is_default,
    created_at,
    created_by,
    updated_at,
    updated_by
  )
  VALUES (
    v_account_id,
    'Hotel Ops',
    TRUE,
    NOW() - interval '180 days',
    v_user_id,
    NOW(),
    v_user_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    is_default = EXCLUDED.is_default,
    updated_at = NOW(),
    updated_by = v_user_id,
    deleted_at = NULL,
    deleted_by = NULL;

  INSERT INTO team_members (
    id,
    account_id,
    user_id,
    role,
    status,
    created_at,
    created_by,
    joined_at,
    deleted_at,
    deleted_by
  )
  VALUES (
    v_team_member_id,
    v_account_id,
    v_user_id,
    'brand',
    'accepted',
    NOW() - interval '180 days',
    v_user_id,
    NOW() - interval '180 days',
    NULL,
    NULL
  )
  ON CONFLICT (account_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'accepted',
    joined_at = COALESCE(team_members.joined_at, EXCLUDED.joined_at),
    deleted_at = NULL,
    deleted_by = NULL;

  INSERT INTO properties (
    id,
    account_id,
    name,
    address_line1,
    city,
    country,
    property_type,
    timezone,
    currency_code,
    is_active,
    created_at,
    created_by,
    updated_at,
    updated_by,
    deleted_at,
    deleted_by
  )
  VALUES (
    v_property_id,
    v_account_id,
    'Grand Plaza Hotel',
    '123 Main Street, City Center',
    'New York',
    'United States',
    'Luxury Hotel',
    'America/New_York',
    'USD',
    TRUE,
    NOW() - interval '180 days',
    v_user_id,
    NOW(),
    v_user_id,
    NULL,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET
    account_id = EXCLUDED.account_id,
    name = EXCLUDED.name,
    address_line1 = EXCLUDED.address_line1,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    property_type = EXCLUDED.property_type,
    timezone = EXCLUDED.timezone,
    currency_code = EXCLUDED.currency_code,
    is_active = TRUE,
    updated_at = NOW(),
    updated_by = v_user_id,
    deleted_at = NULL,
    deleted_by = NULL;

  INSERT INTO user_preferences (
    user_id,
    theme,
    language,
    timezone,
    default_account_id,
    default_property_id,
    updated_at
  )
  VALUES (
    v_user_id,
    'dark',
    'en',
    'America/New_York',
    v_account_id,
    v_property_id,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    theme = EXCLUDED.theme,
    language = EXCLUDED.language,
    timezone = EXCLUDED.timezone,
    default_account_id = EXCLUDED.default_account_id,
    default_property_id = EXCLUDED.default_property_id,
    updated_at = NOW();

  INSERT INTO property_brand_settings (
    property_id,
    tone_of_voice,
    key_selling_points,
    signature_signoff,
    use_guest_names,
    multilingual_responses,
    updated_at,
    updated_by
  )
  VALUES (
    v_property_id,
    'professional',
    ARRAY['Rooftop pool', 'City views', '24/7 concierge'],
    'The Grand Plaza Team',
    TRUE,
    TRUE,
    NOW(),
    v_user_id
  )
  ON CONFLICT (property_id) DO UPDATE
  SET
    tone_of_voice = EXCLUDED.tone_of_voice,
    key_selling_points = EXCLUDED.key_selling_points,
    signature_signoff = EXCLUDED.signature_signoff,
    use_guest_names = EXCLUDED.use_guest_names,
    multilingual_responses = EXCLUDED.multilingual_responses,
    updated_at = NOW(),
    updated_by = v_user_id;

  INSERT INTO property_ai_settings (
    property_id,
    auto_approval_mode,
    updated_at,
    updated_by
  )
  VALUES (
    v_property_id,
    FALSE,
    NOW(),
    v_user_id
  )
  ON CONFLICT (property_id) DO UPDATE
  SET
    auto_approval_mode = EXCLUDED.auto_approval_mode,
    updated_at = NOW(),
    updated_by = v_user_id;

  INSERT INTO property_integrations (
    id,
    property_id,
    provider,
    status,
    external_account_id,
    connected_at,
    last_synced_at,
    metadata,
    created_at,
    updated_at
  )
  VALUES
    (
      '40000000-0000-4000-8000-000000000001',
      v_property_id,
      'tripadvisor',
      'connected',
      'tripadvisor-grand-plaza',
      NOW() - interval '120 days',
      NOW() - interval '2 hours',
      jsonb_build_object('displayName', 'TripAdvisor', 'icon', 'briefcase'),
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000002',
      v_property_id,
      'google_business',
      'connected',
      'google-business-grand-plaza',
      NOW() - interval '120 days',
      NOW() - interval '3 hours',
      jsonb_build_object('displayName', 'Google Business', 'icon', 'search'),
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000003',
      v_property_id,
      'booking_com',
      'connected',
      'bookingcom-grand-plaza',
      NOW() - interval '120 days',
      NOW() - interval '1 hour',
      jsonb_build_object('displayName', 'Booking.com', 'icon', 'hotel'),
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000004',
      v_property_id,
      'expedia',
      'connected',
      'expedia-grand-plaza',
      NOW() - interval '120 days',
      NOW() - interval '4 hours',
      jsonb_build_object('displayName', 'Expedia', 'icon', 'plane'),
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000005',
      v_property_id,
      'facebook',
      'connected',
      'facebook-grand-plaza',
      NOW() - interval '90 days',
      NOW() - interval '5 hours',
      jsonb_build_object('displayName', 'Facebook', 'icon', 'facebook'),
      NOW() - interval '90 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000006',
      v_property_id,
      'instagram',
      'connected',
      'instagram-grand-plaza',
      NOW() - interval '90 days',
      NOW() - interval '6 hours',
      jsonb_build_object('displayName', 'Instagram', 'icon', 'instagram'),
      NOW() - interval '90 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000007',
      v_property_id,
      'whatsapp_business',
      'pending',
      'whatsapp-grand-plaza',
      NULL,
      NOW() - interval '12 hours',
      jsonb_build_object('displayName', 'WhatsApp Business', 'icon', 'message-circle'),
      NOW() - interval '30 days',
      NOW()
    ),
    (
      '40000000-0000-4000-8000-000000000008',
      v_property_id,
      'mailchimp',
      'disconnected',
      'mailchimp-grand-plaza',
      NULL,
      NULL,
      jsonb_build_object('displayName', 'Mailchimp', 'icon', 'mail'),
      NOW() - interval '30 days',
      NOW()
    )
  ON CONFLICT (property_id, provider) DO UPDATE
  SET
    status = EXCLUDED.status,
    external_account_id = EXCLUDED.external_account_id,
    connected_at = EXCLUDED.connected_at,
    last_synced_at = EXCLUDED.last_synced_at,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  INSERT INTO guests (
    id,
    property_id,
    full_name,
    email,
    phone,
    preferred_language,
    metadata,
    created_at,
    updated_at
  )
  VALUES
    ('30000000-0000-4000-8000-000000000001', v_property_id, 'Emma Watson', 'emma.watson@example.com', '+12125550101', 'en', '{}'::jsonb, NOW() - interval '90 days', NOW()),
    ('30000000-0000-4000-8000-000000000002', v_property_id, 'Michael Chen', 'michael.chen@example.com', '+12125550102', 'en', '{}'::jsonb, NOW() - interval '90 days', NOW()),
    ('30000000-0000-4000-8000-000000000003', v_property_id, 'Sophie Martin', 'sophie.martin@example.com', '+12125550103', 'en', '{}'::jsonb, NOW() - interval '90 days', NOW()),
    ('30000000-0000-4000-8000-000000000004', v_property_id, 'David Kim', 'david.kim@example.com', '+12125550104', 'en', '{}'::jsonb, NOW() - interval '90 days', NOW()),
    ('30000000-0000-4000-8000-000000000005', v_property_id, 'Sarah Mitchell', 'sarah.mitchell@example.com', NULL, 'en', '{}'::jsonb, NOW() - interval '30 days', NOW()),
    ('30000000-0000-4000-8000-000000000006', v_property_id, 'James Kennedy', 'james.kennedy@example.com', NULL, 'en', '{}'::jsonb, NOW() - interval '30 days', NOW()),
    ('30000000-0000-4000-8000-000000000007', v_property_id, 'Maria Lopez', 'maria.lopez@example.com', NULL, 'es', '{}'::jsonb, NOW() - interval '30 days', NOW()),
    ('30000000-0000-4000-8000-000000000008', v_property_id, 'Robert Chen', 'robert.chen@example.com', NULL, 'en', '{}'::jsonb, NOW() - interval '30 days', NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    preferred_language = EXCLUDED.preferred_language,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  INSERT INTO bookings (
    id,
    property_id,
    guest_id,
    integration_id,
    external_booking_id,
    check_in,
    check_out,
    room_type,
    booking_status,
    total_amount,
    currency_code,
    created_at,
    updated_at
  )
  VALUES
    (
      '50000000-0000-4000-8000-000000000001',
      v_property_id,
      '30000000-0000-4000-8000-000000000001',
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'booking_com'::integration_provider LIMIT 1),
      'BK-' || v_year || '-0001',
      make_date(v_year, 1, 15),
      make_date(v_year, 1, 18),
      'Deluxe City View',
      'confirmed',
      980.00,
      'USD',
      NOW() - interval '60 days',
      NOW()
    ),
    (
      '50000000-0000-4000-8000-000000000002',
      v_property_id,
      '30000000-0000-4000-8000-000000000002',
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'booking_com'::integration_provider LIMIT 1),
      'BK-' || v_year || '-0002',
      make_date(v_year, 1, 20),
      make_date(v_year, 1, 22),
      'Executive Room',
      'confirmed',
      760.00,
      'USD',
      NOW() - interval '50 days',
      NOW()
    ),
    (
      '50000000-0000-4000-8000-000000000003',
      v_property_id,
      '30000000-0000-4000-8000-000000000003',
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'booking_com'::integration_provider LIMIT 1),
      'BK-' || v_year || '-0003',
      make_date(v_year, 2, 1),
      make_date(v_year, 2, 5),
      'Standard King',
      'confirmed',
      1240.00,
      'USD',
      NOW() - interval '40 days',
      NOW()
    ),
    (
      '50000000-0000-4000-8000-000000000004',
      v_property_id,
      '30000000-0000-4000-8000-000000000004',
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'expedia'::integration_provider LIMIT 1),
      'EX-' || v_year || '-0004',
      make_date(v_year, 1, 12),
      make_date(v_year, 1, 14),
      'Suite',
      'confirmed',
      680.00,
      'USD',
      NOW() - interval '70 days',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    guest_id = EXCLUDED.guest_id,
    integration_id = EXCLUDED.integration_id,
    external_booking_id = EXCLUDED.external_booking_id,
    check_in = EXCLUDED.check_in,
    check_out = EXCLUDED.check_out,
    room_type = EXCLUDED.room_type,
    booking_status = EXCLUDED.booking_status,
    total_amount = EXCLUDED.total_amount,
    currency_code = EXCLUDED.currency_code,
    updated_at = NOW();

  INSERT INTO conversations (
    id,
    property_id,
    guest_id,
    booking_id,
    channel,
    channel_thread_id,
    status,
    unread_count,
    last_message_at,
    last_message_preview,
    created_at,
    updated_at
  )
  VALUES
    (
      '60000000-0000-4000-8000-000000000001',
      v_property_id,
      '30000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      'whatsapp',
      'whatsapp-emma-001',
      'open',
      1,
      NOW() - interval '2 minutes',
      'What time is check-in?',
      NOW() - interval '20 days',
      NOW()
    ),
    (
      '60000000-0000-4000-8000-000000000002',
      v_property_id,
      '30000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000002',
      'email',
      'email-michael-001',
      'open',
      1,
      NOW() - interval '15 minutes',
      'Can I request a room with a city view?',
      NOW() - interval '18 days',
      NOW()
    ),
    (
      '60000000-0000-4000-8000-000000000003',
      v_property_id,
      '30000000-0000-4000-8000-000000000003',
      '50000000-0000-4000-8000-000000000003',
      'booking',
      'booking-sophie-001',
      'open',
      0,
      NOW() - interval '1 hour',
      'Is airport pickup available?',
      NOW() - interval '16 days',
      NOW()
    ),
    (
      '60000000-0000-4000-8000-000000000004',
      v_property_id,
      '30000000-0000-4000-8000-000000000004',
      '50000000-0000-4000-8000-000000000004',
      'sms',
      'sms-david-001',
      'open',
      0,
      NOW() - interval '3 hours',
      'Thank you for the upgrade!',
      NOW() - interval '14 days',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    guest_id = EXCLUDED.guest_id,
    booking_id = EXCLUDED.booking_id,
    channel = EXCLUDED.channel,
    channel_thread_id = EXCLUDED.channel_thread_id,
    status = EXCLUDED.status,
    unread_count = EXCLUDED.unread_count,
    last_message_at = EXCLUDED.last_message_at,
    last_message_preview = EXCLUDED.last_message_preview,
    updated_at = NOW();

  INSERT INTO conversation_messages (
    id,
    conversation_id,
    sender,
    content,
    is_ai_generated,
    delivery_status,
    metadata,
    created_at,
    created_by
  )
  VALUES
    (
      '61000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      'guest',
      'What time is check-in?',
      FALSE,
      'read',
      '{}'::jsonb,
      NOW() - interval '2 minutes',
      NULL
    ),
    (
      '61000000-0000-4000-8000-000000000002',
      '60000000-0000-4000-8000-000000000001',
      'ai',
      'Check-in starts at 3:00 PM. Early check-in is available upon request.',
      TRUE,
      'sent',
      '{}'::jsonb,
      NOW() - interval '1 minute',
      v_user_id
    ),
    (
      '61000000-0000-4000-8000-000000000003',
      '60000000-0000-4000-8000-000000000002',
      'guest',
      'Can I request a room with a city view?',
      FALSE,
      'read',
      '{}'::jsonb,
      NOW() - interval '15 minutes',
      NULL
    ),
    (
      '61000000-0000-4000-8000-000000000004',
      '60000000-0000-4000-8000-000000000002',
      'ai',
      'Absolutely! I''ve noted your preference for a city view room.',
      TRUE,
      'sent',
      '{}'::jsonb,
      NOW() - interval '14 minutes',
      v_user_id
    ),
    (
      '61000000-0000-4000-8000-000000000005',
      '60000000-0000-4000-8000-000000000003',
      'guest',
      'Is airport pickup available?',
      FALSE,
      'read',
      '{}'::jsonb,
      NOW() - interval '1 hour',
      NULL
    ),
    (
      '61000000-0000-4000-8000-000000000006',
      '60000000-0000-4000-8000-000000000003',
      'ai',
      'Yes, we offer airport pickup for $45. Would you like me to arrange this?',
      TRUE,
      'sent',
      '{}'::jsonb,
      NOW() - interval '59 minutes',
      v_user_id
    ),
    (
      '61000000-0000-4000-8000-000000000007',
      '60000000-0000-4000-8000-000000000004',
      'guest',
      'Thank you for the upgrade!',
      FALSE,
      'read',
      '{}'::jsonb,
      NOW() - interval '3 hours',
      NULL
    ),
    (
      '61000000-0000-4000-8000-000000000008',
      '60000000-0000-4000-8000-000000000004',
      'ai',
      'You''re most welcome! We hope you enjoy the suite.',
      TRUE,
      'sent',
      '{}'::jsonb,
      NOW() - interval '2 hours 59 minutes',
      v_user_id
    )
  ON CONFLICT (id) DO UPDATE
  SET
    conversation_id = EXCLUDED.conversation_id,
    sender = EXCLUDED.sender,
    content = EXCLUDED.content,
    is_ai_generated = EXCLUDED.is_ai_generated,
    delivery_status = EXCLUDED.delivery_status,
    metadata = EXCLUDED.metadata,
    created_at = EXCLUDED.created_at,
    created_by = EXCLUDED.created_by;

  INSERT INTO reviews (
    id,
    property_id,
    integration_id,
    external_review_id,
    platform,
    guest_id,
    author_name,
    rating,
    title,
    body,
    reviewed_at,
    status,
    sentiment,
    external_url,
    created_at,
    updated_at
  )
  VALUES
    (
      '70000000-0000-4000-8000-000000000001',
      v_property_id,
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'tripadvisor'::integration_provider LIMIT 1),
      'TA-1001',
      'tripadvisor',
      '30000000-0000-4000-8000-000000000005',
      'Sarah Mitchell',
      5,
      'Absolutely stunning hotel!',
      $r1$The staff went above and beyond to make our anniversary special. The room had a beautiful view of the city, and the breakfast buffet was exceptional. We will definitely be returning!$r1$,
      NOW() - interval '2 hours',
      'pending',
      'positive',
      'https://www.tripadvisor.com/',
      NOW() - interval '2 hours',
      NOW()
    ),
    (
      '70000000-0000-4000-8000-000000000002',
      v_property_id,
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'google_business'::integration_provider LIMIT 1),
      'GB-2001',
      'google_business',
      '30000000-0000-4000-8000-000000000006',
      'James Kennedy',
      4,
      'Great location, minor issues',
      $r2$The hotel is perfectly located for exploring the city. Rooms are comfortable and clean. Only minor complaint is that the breakfast could use more variety, especially for vegetarians.$r2$,
      NOW() - interval '5 hours',
      'pending',
      'positive',
      'https://www.google.com/maps',
      NOW() - interval '5 hours',
      NOW()
    ),
    (
      '70000000-0000-4000-8000-000000000003',
      v_property_id,
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'booking_com'::integration_provider LIMIT 1),
      'BC-3001',
      'booking_com',
      '30000000-0000-4000-8000-000000000007',
      'Maria Lopez',
      3,
      'AC problems during stay',
      $r3$The room was clean and well-decorated, but unfortunately the air conditioning wasn't working properly during our stay. Staff tried to fix it but the issue persisted. Expected better for the price.$r3$,
      NOW() - interval '1 day',
      'urgent',
      'negative',
      'https://www.booking.com/',
      NOW() - interval '1 day',
      NOW()
    ),
    (
      '70000000-0000-4000-8000-000000000004',
      v_property_id,
      (SELECT id FROM property_integrations WHERE property_id = v_property_id AND provider = 'expedia'::integration_provider LIMIT 1),
      'EX-4001',
      'expedia',
      '30000000-0000-4000-8000-000000000008',
      'Robert Chen',
      5,
      'Business travel perfection',
      $r4$Stayed for a week-long business trip. Fast WiFi, quiet rooms, excellent gym, and the business center was well-equipped. The location made it easy to get to meetings across the city.$r4$,
      NOW() - interval '2 days',
      'approved',
      'positive',
      'https://www.expedia.com/',
      NOW() - interval '2 days',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    integration_id = EXCLUDED.integration_id,
    external_review_id = EXCLUDED.external_review_id,
    platform = EXCLUDED.platform,
    guest_id = EXCLUDED.guest_id,
    author_name = EXCLUDED.author_name,
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    reviewed_at = EXCLUDED.reviewed_at,
    status = EXCLUDED.status,
    sentiment = EXCLUDED.sentiment,
    external_url = EXCLUDED.external_url,
    updated_at = NOW();

  UPDATE review_response_drafts
  SET is_current = FALSE
  WHERE review_id IN (
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000003',
    '70000000-0000-4000-8000-000000000004'
  )
    AND version_no <> 1;

  INSERT INTO review_response_drafts (
    id,
    review_id,
    version_no,
    content,
    variant,
    status,
    generated_by_ai,
    is_current,
    created_by,
    created_at,
    published_at
  )
  VALUES
    (
      '71000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      1,
      $d1$Dear Sarah, thank you so much for your wonderful review! We're absolutely delighted to hear that your anniversary celebration was made special at our hotel. Our team takes great pride in creating memorable experiences for our guests. We look forward to welcoming you back soon!$d1$,
      'default',
      'draft',
      TRUE,
      TRUE,
      v_user_id,
      NOW() - interval '2 hours',
      NULL
    ),
    (
      '71000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000002',
      1,
      $d2$Thank you for your feedback, James! We're pleased you enjoyed our central location and comfortable accommodations. Your suggestion about expanding our vegetarian breakfast options is valuable, and we've shared it with our culinary team. We hope to welcome you again soon!$d2$,
      'default',
      'draft',
      TRUE,
      TRUE,
      v_user_id,
      NOW() - interval '5 hours',
      NULL
    ),
    (
      '71000000-0000-4000-8000-000000000003',
      '70000000-0000-4000-8000-000000000003',
      1,
      $d3$Dear Maria, we sincerely apologize for the inconvenience caused by the air conditioning issues during your stay. This is not the standard of comfort we aim to provide. We have since had our HVAC system fully serviced. As a gesture of goodwill, we'd like to offer you a discount on your next stay. Please contact us directly to arrange this.$d3$,
      'apology',
      'draft',
      TRUE,
      TRUE,
      v_user_id,
      NOW() - interval '1 day',
      NULL
    ),
    (
      '71000000-0000-4000-8000-000000000004',
      '70000000-0000-4000-8000-000000000004',
      1,
      $d4$Thank you Robert! We're thrilled our hotel met all your business travel needs. Our facilities are designed with professionals like you in mind. We appreciate your detailed feedback and look forward to being your home away from home on future business trips!$d4$,
      'formal',
      'approved',
      TRUE,
      TRUE,
      v_user_id,
      NOW() - interval '2 days',
      NOW() - interval '2 days'
    )
  ON CONFLICT (review_id, version_no) DO UPDATE
  SET
    content = EXCLUDED.content,
    variant = EXCLUDED.variant,
    status = EXCLUDED.status,
    generated_by_ai = EXCLUDED.generated_by_ai,
    is_current = EXCLUDED.is_current,
    created_by = EXCLUDED.created_by,
    created_at = EXCLUDED.created_at,
    published_at = EXCLUDED.published_at;

  INSERT INTO social_posts (
    id,
    property_id,
    title,
    content,
    status,
    scheduled_at,
    published_at,
    ai_generated,
    estimated_reach,
    actual_reach,
    engagement_rate,
    created_by,
    created_at,
    updated_at
  )
  VALUES
    (
      '80000000-0000-4000-8000-000000000001',
      v_property_id,
      'Summer Pool Vibes',
      'Dive into relaxation this summer at our stunning rooftop pool. Book now and get 20% off your stay! #SummerGetaway #HotelLife',
      'scheduled',
      date_trunc('day', NOW()) + interval '14 hours',
      NULL,
      TRUE,
      2100,
      NULL,
      4.8,
      v_user_id,
      NOW() - interval '3 days',
      NOW()
    ),
    (
      '80000000-0000-4000-8000-000000000002',
      v_property_id,
      'Weekend Getaway Package',
      'Escape the city stress with our exclusive weekend package. Includes breakfast, spa access, and a complimentary room upgrade.',
      'scheduled',
      date_trunc('day', NOW()) + interval '1 day 10 hours',
      NULL,
      TRUE,
      1800,
      NULL,
      4.6,
      v_user_id,
      NOW() - interval '2 days',
      NOW()
    ),
    (
      '80000000-0000-4000-8000-000000000003',
      v_property_id,
      'Business Travel Excellence',
      'Our business center is now open 24/7 with high-speed WiFi, private meeting rooms, and complimentary coffee.',
      'draft',
      date_trunc('day', NOW()) + interval '2 days 9 hours',
      NULL,
      FALSE,
      950,
      NULL,
      3.9,
      v_user_id,
      NOW() - interval '1 day',
      NOW()
    ),
    (
      '80000000-0000-4000-8000-000000000004',
      v_property_id,
      'Sunset Views',
      'Witness breathtaking sunsets from our Sky Lounge every evening. Perfect for romantic dinners or client entertainment.',
      'scheduled',
      date_trunc('day', NOW()) + interval '3 days 18 hours',
      NULL,
      TRUE,
      3200,
      NULL,
      5.1,
      v_user_id,
      NOW() - interval '20 hours',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    status = EXCLUDED.status,
    scheduled_at = EXCLUDED.scheduled_at,
    published_at = EXCLUDED.published_at,
    ai_generated = EXCLUDED.ai_generated,
    estimated_reach = EXCLUDED.estimated_reach,
    actual_reach = EXCLUDED.actual_reach,
    engagement_rate = EXCLUDED.engagement_rate,
    created_by = EXCLUDED.created_by,
    updated_at = NOW();

  DELETE FROM social_post_platforms
  WHERE post_id IN (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000003',
    '80000000-0000-4000-8000-000000000004'
  );

  INSERT INTO social_post_platforms (post_id, platform)
  VALUES
    ('80000000-0000-4000-8000-000000000001', 'instagram'),
    ('80000000-0000-4000-8000-000000000001', 'facebook'),
    ('80000000-0000-4000-8000-000000000002', 'facebook'),
    ('80000000-0000-4000-8000-000000000002', 'linkedin'),
    ('80000000-0000-4000-8000-000000000003', 'linkedin'),
    ('80000000-0000-4000-8000-000000000004', 'instagram')
  ON CONFLICT (post_id, platform) DO NOTHING;

  DELETE FROM social_post_assets
  WHERE post_id IN (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000003',
    '80000000-0000-4000-8000-000000000004'
  );

  INSERT INTO social_post_assets (
    id,
    post_id,
    asset_url,
    asset_type,
    sort_order,
    created_at
  )
  VALUES
    ('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop', 'image', 0, NOW()),
    ('81000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop', 'image', 0, NOW()),
    ('81000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop', 'image', 0, NOW()),
    ('81000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop', 'image', 0, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    post_id = EXCLUDED.post_id,
    asset_url = EXCLUDED.asset_url,
    asset_type = EXCLUDED.asset_type,
    sort_order = EXCLUDED.sort_order;

  UPDATE social_post_versions
  SET is_current = FALSE
  WHERE post_id IN (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000003',
    '80000000-0000-4000-8000-000000000004'
  )
    AND version_no <> 1;

  INSERT INTO social_post_versions (
    id,
    post_id,
    version_no,
    title,
    content,
    optimization_reason,
    generated_by_ai,
    is_current,
    created_at,
    created_by
  )
  VALUES
    (
      '82000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      1,
      'Summer Pool Vibes',
      'Dive into relaxation this summer at our stunning rooftop pool. Book now and get 20% off your stay! #SummerGetaway #HotelLife',
      'Initial seed draft',
      TRUE,
      TRUE,
      NOW() - interval '3 days',
      v_user_id
    ),
    (
      '82000000-0000-4000-8000-000000000002',
      '80000000-0000-4000-8000-000000000002',
      1,
      'Weekend Getaway Package',
      'Escape the city stress with our exclusive weekend package. Includes breakfast, spa access, and a complimentary room upgrade.',
      'Initial seed draft',
      TRUE,
      TRUE,
      NOW() - interval '2 days',
      v_user_id
    ),
    (
      '82000000-0000-4000-8000-000000000003',
      '80000000-0000-4000-8000-000000000003',
      1,
      'Business Travel Excellence',
      'Our business center is now open 24/7 with high-speed WiFi, private meeting rooms, and complimentary coffee.',
      'Initial seed draft',
      FALSE,
      TRUE,
      NOW() - interval '1 day',
      v_user_id
    ),
    (
      '82000000-0000-4000-8000-000000000004',
      '80000000-0000-4000-8000-000000000004',
      1,
      'Sunset Views',
      'Witness breathtaking sunsets from our Sky Lounge every evening. Perfect for romantic dinners or client entertainment.',
      'Initial seed draft',
      TRUE,
      TRUE,
      NOW() - interval '20 hours',
      v_user_id
    )
  ON CONFLICT (post_id, version_no) DO UPDATE
  SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    optimization_reason = EXCLUDED.optimization_reason,
    generated_by_ai = EXCLUDED.generated_by_ai,
    is_current = EXCLUDED.is_current,
    created_at = EXCLUDED.created_at,
    created_by = EXCLUDED.created_by;

  INSERT INTO campaigns (
    id,
    property_id,
    name,
    description,
    status,
    start_date,
    end_date,
    progress_percent,
    reach_total,
    conversions_total,
    revenue_total,
    created_by,
    created_at,
    updated_at
  )
  VALUES
    (
      '90000000-0000-4000-8000-000000000001',
      v_property_id,
      'Valentine''s Day Special',
      'Seasonal Valentine promotion across email, social, and SMS.',
      'active',
      make_date(v_year, 2, 1),
      make_date(v_year, 2, 14),
      45,
      12400,
      89,
      24500,
      v_user_id,
      NOW() - interval '20 days',
      NOW()
    ),
    (
      '90000000-0000-4000-8000-000000000002',
      v_property_id,
      'Summer Getaway',
      'Summer campaign focused on weekend stays and package upgrades.',
      'scheduled',
      make_date(v_year, 6, 1),
      make_date(v_year, 8, 31),
      0,
      0,
      0,
      0,
      v_user_id,
      NOW() - interval '10 days',
      NOW()
    ),
    (
      '90000000-0000-4000-8000-000000000003',
      v_property_id,
      'Holiday Season',
      'Holiday campaign covering year-end and New Year stay promotions.',
      'completed',
      make_date(v_year - 1, 12, 15),
      make_date(v_year, 1, 5),
      100,
      45200,
      312,
      89400,
      v_user_id,
      NOW() - interval '30 days',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    progress_percent = EXCLUDED.progress_percent,
    reach_total = EXCLUDED.reach_total,
    conversions_total = EXCLUDED.conversions_total,
    revenue_total = EXCLUDED.revenue_total,
    updated_at = NOW();

  DELETE FROM campaign_channels
  WHERE campaign_id IN (
    '90000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000003'
  );

  INSERT INTO campaign_channels (campaign_id, channel)
  VALUES
    ('90000000-0000-4000-8000-000000000001', 'email'),
    ('90000000-0000-4000-8000-000000000001', 'social'),
    ('90000000-0000-4000-8000-000000000001', 'sms'),
    ('90000000-0000-4000-8000-000000000002', 'email'),
    ('90000000-0000-4000-8000-000000000002', 'social'),
    ('90000000-0000-4000-8000-000000000003', 'email'),
    ('90000000-0000-4000-8000-000000000003', 'social'),
    ('90000000-0000-4000-8000-000000000003', 'sms')
  ON CONFLICT (campaign_id, channel) DO NOTHING;

  INSERT INTO campaign_templates (
    id,
    account_id,
    name,
    category,
    preview_image_url,
    template_payload,
    is_active,
    created_at,
    updated_at
  )
  VALUES
    (
      '91000000-0000-4000-8000-000000000001',
      NULL,
      'Valentine''s Romance',
      'Seasonal',
      'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=150&fit=crop',
      jsonb_build_object('description', 'Romance package promotion', 'channels', jsonb_build_array('email', 'social', 'sms')),
      TRUE,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '91000000-0000-4000-8000-000000000002',
      NULL,
      'Summer Escape',
      'Seasonal',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop',
      jsonb_build_object('description', 'Summer travel campaign', 'channels', jsonb_build_array('email', 'social')),
      TRUE,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '91000000-0000-4000-8000-000000000003',
      NULL,
      'Business Package',
      'Offer',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=150&fit=crop',
      jsonb_build_object('description', 'Corporate traveler package', 'channels', jsonb_build_array('email', 'social')),
      TRUE,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      '91000000-0000-4000-8000-000000000004',
      NULL,
      'Weekend Deal',
      'Promo',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200&h=150&fit=crop',
      jsonb_build_object('description', 'Weekend occupancy booster', 'channels', jsonb_build_array('social', 'sms')),
      TRUE,
      NOW() - interval '120 days',
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    preview_image_url = EXCLUDED.preview_image_url,
    template_payload = EXCLUDED.template_payload,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  INSERT INTO ai_agents (
    property_id,
    key,
    name,
    description,
    status,
    enabled,
    auto_approve,
    max_tasks_per_hour,
    priority_level,
    notifications_enabled,
    retry_on_failure,
    max_retries,
    created_at,
    updated_at
  )
  VALUES
    (
      v_property_id,
      'review_reply',
      'Review Reply Agent',
      'Auto-generate personalized review responses',
      'active',
      TRUE,
      FALSE,
      20,
      'high',
      TRUE,
      TRUE,
      3,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      v_property_id,
      'social_posting',
      'Social Posting Agent',
      'Generate and schedule social media posts',
      'active',
      TRUE,
      TRUE,
      10,
      'medium',
      TRUE,
      TRUE,
      2,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      v_property_id,
      'messaging',
      'Messaging Agent',
      'Handle guest inquiries automatically',
      'active',
      TRUE,
      TRUE,
      50,
      'high',
      TRUE,
      TRUE,
      3,
      NOW() - interval '120 days',
      NOW()
    ),
    (
      v_property_id,
      'campaign',
      'Campaign Agent',
      'Create and manage seasonal campaigns',
      'active',
      TRUE,
      FALSE,
      5,
      'low',
      TRUE,
      FALSE,
      1,
      NOW() - interval '120 days',
      NOW()
    )
  ON CONFLICT (property_id, key) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    enabled = EXCLUDED.enabled,
    auto_approve = EXCLUDED.auto_approve,
    max_tasks_per_hour = EXCLUDED.max_tasks_per_hour,
    priority_level = EXCLUDED.priority_level,
    notifications_enabled = EXCLUDED.notifications_enabled,
    retry_on_failure = EXCLUDED.retry_on_failure,
    max_retries = EXCLUDED.max_retries,
    updated_at = NOW();

  WITH task_seed AS (
    SELECT *
    FROM (
      VALUES
        ('a0000000-0000-4000-8000-000000000001'::uuid, 'review_reply',   'reviews.reply',   'Generated response for 5-star Booking.com review',         'Response approved and posted automatically',                         'completed', 5,   2300, 240, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000002'::uuid, 'review_reply',   'reviews.reply',   'Flagged negative review for manual review',                 'Review requires human attention due to complaint',                    'completed', 25,  2300, 300, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000003'::uuid, 'review_reply',   'reviews.reply',   'Generated response for TripAdvisor review',                  NULL,                                                            'completed', 60,  2200, 210, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000004'::uuid, 'review_reply',   'reviews.reply',   'Batch processed 8 Expedia reviews',                          'All responses generated successfully',                                  'completed', 120, 2600, 480, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000005'::uuid, 'review_reply',   'reviews.reply',   'Failed to fetch Google reviews',                             'API rate limit exceeded, retrying in 1 hour',                          'failed',    180, 4100, 0,   'API rate limit exceeded', '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000006'::uuid, 'review_reply',   'reviews.reply',   'Generated personalized response for repeat guest',           NULL,                                                            'completed', 240, 2100, 240, NULL, '{}'::jsonb),

        ('a0000000-0000-4000-8000-000000000007'::uuid, 'social_posting', 'social.schedule', 'Scheduled Instagram post for tomorrow 9 AM',                'Photo carousel with 4 images',                                         'completed', 12,  4100, 180, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000008'::uuid, 'social_posting', 'social.schedule', 'Generated Twitter thread about weekend specials',           NULL,                                                            'completed', 60,  3900, 150, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000009'::uuid, 'social_posting', 'social.schedule', 'Preparing Facebook post for Valentine''s promo',            'Awaiting image generation',                                             'pending',   120, NULL,  0,   NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000010'::uuid, 'social_posting', 'social.schedule', 'Posted story to Instagram',                                  NULL,                                                            'completed', 180, 4300, 120, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000011'::uuid, 'social_posting', 'social.schedule', 'Analyzed best posting times for this week',                 NULL,                                                            'completed', 300, 4600, 90,  NULL, '{}'::jsonb),

        ('a0000000-0000-4000-8000-000000000012'::uuid, 'messaging',      'messages.reply',  'Responded to guest inquiry about check-in time',            'Provided early check-in options',                                      'completed', 2,   1800, 180, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000013'::uuid, 'messaging',      'messages.reply',  'Handled room upgrade request',                                'Upgraded to suite, confirmed with guest',                              'completed', 18,  1700, 210, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000014'::uuid, 'messaging',      'messages.reply',  'Answered FAQ about parking',                                  NULL,                                                            'completed', 30,  1600, 120, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000015'::uuid, 'messaging',      'messages.reply',  'Escalated complaint to manager',                              'Guest reported noise issue',                                           'completed', 45,  2200, 60,  NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000016'::uuid, 'messaging',      'messages.reply',  'Processed late checkout request',                             NULL,                                                            'completed', 60,  1750, 120, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000017'::uuid, 'messaging',      'messages.reply',  'Sent welcome message to new booking',                         NULL,                                                            'completed', 120, 1650, 90,  NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000018'::uuid, 'messaging',      'messages.reply',  'Failed to process payment inquiry',                           'Payment system temporarily unavailable',                                'failed',    180, 3000, 0,   'Payment gateway unavailable', '{}'::jsonb),

        ('a0000000-0000-4000-8000-000000000019'::uuid, 'campaign',       'campaign.manage', 'Creating Valentine''s Day email campaign',                    'Generating email copy and visuals',                                     'pending',   15,  NULL,  0,   NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000020'::uuid, 'campaign',       'campaign.manage', 'Analyzed Q4 campaign performance',                            'ROI: 340%, CTR: 4.2%',                                                  'completed', 60,  5200, 600, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000021'::uuid, 'campaign',       'campaign.manage', 'Scheduled Spring Break promotion',                            NULL,                                                            'completed', 180, 5100, 420, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000022'::uuid, 'campaign',       'campaign.manage', 'A/B test completed for subject lines',                       'Version B won with 12% higher open rate',                              'completed', 300, 5300, 540, NULL, '{}'::jsonb),

        ('a0000000-0000-4000-8000-000000000023'::uuid, 'review_reply',   'reviews.alert',   'New 5-star review on TripAdvisor',                           'AI drafted a response for your approval',                               'completed', 2,   2200, 120, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000024'::uuid, 'social_posting', 'social.publish',  'Instagram post published',                                   'Summer promotion reached 2.4k impressions',                             'completed', 15,  4000, 180, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000025'::uuid, 'messaging',      'messages.reply',  'Booking inquiry responded',                                  'AI answered availability question on WhatsApp',                         'completed', 32,  1900, 150, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000026'::uuid, 'campaign',       'campaign.manage', 'Valentine''s campaign scheduled',                             'Email campaign set for Feb 1st',                                        'completed', 60,  4900, 420, NULL, '{}'::jsonb),
        ('a0000000-0000-4000-8000-000000000027'::uuid, 'review_reply',   'reviews.alert',   '3-star review needs attention',                              'Guest mentioned AC issues - prioritized',                               'completed', 120, 2400, 180, NULL, '{}'::jsonb)
    ) AS t(
      id,
      agent_key,
      task_type,
      action,
      details,
      status,
      minutes_ago,
      response_ms,
      time_saved_seconds,
      error_message,
      metadata
    )
  )
  INSERT INTO ai_agent_task_runs (
    id,
    property_id,
    agent_id,
    task_type,
    action,
    details,
    status,
    started_at,
    finished_at,
    response_time_ms,
    time_saved_seconds,
    error_message,
    metadata,
    created_by,
    created_at
  )
  SELECT
    t.id,
    v_property_id,
    aa.id,
    t.task_type,
    t.action,
    t.details,
    t.status::agent_task_status,
    NOW() - make_interval(mins => t.minutes_ago),
    CASE
      WHEN t.status = 'pending' THEN NULL
      ELSE (NOW() - make_interval(mins => t.minutes_ago)) + interval '30 seconds'
    END,
    t.response_ms,
    t.time_saved_seconds,
    t.error_message,
    t.metadata,
    v_user_id,
    NOW() - make_interval(mins => t.minutes_ago)
  FROM task_seed t
  LEFT JOIN ai_agents aa
    ON aa.property_id = v_property_id
   AND aa.key = t.agent_key::agent_key
  ON CONFLICT (id) DO UPDATE
  SET
    property_id = EXCLUDED.property_id,
    agent_id = EXCLUDED.agent_id,
    task_type = EXCLUDED.task_type,
    action = EXCLUDED.action,
    details = EXCLUDED.details,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    finished_at = EXCLUDED.finished_at,
    response_time_ms = EXCLUDED.response_time_ms,
    time_saved_seconds = EXCLUDED.time_saved_seconds,
    error_message = EXCLUDED.error_message,
    metadata = EXCLUDED.metadata,
    created_by = EXCLUDED.created_by,
    created_at = EXCLUDED.created_at;

  INSERT INTO property_notification_preferences (
    property_id,
    user_id,
    new_reviews,
    negative_reviews,
    guest_messages,
    campaign_performance,
    ai_agent_activity,
    updated_at
  )
  VALUES (
    v_property_id,
    v_user_id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    NOW()
  )
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    new_reviews = EXCLUDED.new_reviews,
    negative_reviews = EXCLUDED.negative_reviews,
    guest_messages = EXCLUDED.guest_messages,
    campaign_performance = EXCLUDED.campaign_performance,
    ai_agent_activity = EXCLUDED.ai_agent_activity,
    updated_at = NOW();

  INSERT INTO notifications (
    id,
    user_id,
    account_id,
    property_id,
    subject,
    body,
    type,
    details,
    cta,
    is_read,
    read_at,
    metadata,
    created_at,
    deleted_at,
    deleted_by
  )
  VALUES
    (
      'b0000000-0000-4000-8000-000000000001',
      v_user_id,
      v_account_id,
      v_property_id,
      'New 5-star review on TripAdvisor',
      'AI drafted a response for your approval.',
      'new_review',
      'Review reply agent prepared a draft.',
      'Open Reviews',
      FALSE,
      NULL,
      jsonb_build_object('screen', 'reviews'),
      NOW() - interval '2 minutes',
      NULL,
      NULL
    ),
    (
      'b0000000-0000-4000-8000-000000000002',
      v_user_id,
      v_account_id,
      v_property_id,
      'New guest message',
      'Guest asked about check-in time.',
      'guest_message',
      'WhatsApp conversation updated.',
      'Open Messaging',
      FALSE,
      NULL,
      jsonb_build_object('screen', 'messaging'),
      NOW() - interval '15 minutes',
      NULL,
      NULL
    ),
    (
      'b0000000-0000-4000-8000-000000000003',
      v_user_id,
      v_account_id,
      v_property_id,
      'Campaign performance update',
      'Valentine campaign reached target engagement.',
      'campaign_performance',
      'Weekly analytics summary is ready.',
      'Open Campaigns',
      FALSE,
      NULL,
      jsonb_build_object('screen', 'campaigns'),
      NOW() - interval '1 hour',
      NULL,
      NULL
    ),
    (
      'b0000000-0000-4000-8000-000000000004',
      v_user_id,
      v_account_id,
      v_property_id,
      'Negative review alert',
      '3-star review requires attention.',
      'negative_review',
      'Guest mentioned AC issues.',
      'Open Review',
      FALSE,
      NULL,
      jsonb_build_object('screen', 'reviews', 'priority', 'high'),
      NOW() - interval '2 hours',
      NULL,
      NULL
    ),
    (
      'b0000000-0000-4000-8000-000000000005',
      v_user_id,
      v_account_id,
      v_property_id,
      'AI agent activity summary',
      'Daily AI summary is ready.',
      'ai_agent_activity',
      'Review reply and messaging agents completed tasks.',
      'Open Agents',
      TRUE,
      NOW() - interval '3 hours',
      jsonb_build_object('screen', 'agents'),
      NOW() - interval '4 hours',
      NULL,
      NULL
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    account_id = EXCLUDED.account_id,
    property_id = EXCLUDED.property_id,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    type = EXCLUDED.type,
    details = EXCLUDED.details,
    cta = EXCLUDED.cta,
    is_read = EXCLUDED.is_read,
    read_at = EXCLUDED.read_at,
    metadata = EXCLUDED.metadata,
    created_at = EXCLUDED.created_at,
    deleted_at = NULL,
    deleted_by = NULL;

  WITH monthly_metrics AS (
    SELECT *
    FROM (
      VALUES
        (0, 42000::numeric, 8400::numeric, 170::numeric, 82::numeric, 4.30::numeric, 210::numeric, 560::numeric, 8400::numeric, 28::numeric, 8.20::numeric),
        (1, 48000::numeric, 11520::numeric, 174::numeric, 83::numeric, 4.35::numeric, 195::numeric, 600::numeric, 11520::numeric, 30::numeric, 8.20::numeric),
        (2, 52000::numeric, 14040::numeric, 178::numeric, 84::numeric, 4.40::numeric, 180::numeric, 640::numeric, 14040::numeric, 32::numeric, 8.20::numeric),
        (3, 58000::numeric, 17400::numeric, 182::numeric, 85::numeric, 4.45::numeric, 168::numeric, 700::numeric, 17400::numeric, 35::numeric, 8.20::numeric),
        (4, 71000::numeric, 24850::numeric, 186::numeric, 86::numeric, 4.50::numeric, 156::numeric, 760::numeric, 24850::numeric, 38::numeric, 8.20::numeric),
        (5, 89000::numeric, 35600::numeric, 190::numeric, 88::numeric, 4.55::numeric, 150::numeric, 800::numeric, 35600::numeric, 40::numeric, 8.20::numeric),
        (6, 94000::numeric, 39480::numeric, 187::numeric, 87::numeric, 4.60::numeric, 144::numeric, 880::numeric, 39480::numeric, 44::numeric, 8.20::numeric)
    ) AS m(
      month_offset,
      total_revenue,
      ai_revenue_contribution,
      revpar,
      occupancy_rate,
      avg_rating,
      response_time_minutes,
      labor_cost_saved,
      revenue_attributed,
      time_saved_hours,
      roi_ratio
    )
  )
  INSERT INTO property_metric_daily (
    property_id,
    metric_date,
    revpar,
    occupancy_rate,
    avg_rating,
    response_time_minutes,
    total_revenue,
    ai_revenue_contribution,
    labor_cost_saved,
    revenue_attributed,
    time_saved_hours,
    roi_ratio,
    created_at,
    updated_at
  )
  SELECT
    v_property_id,
    (v_base_month + (m.month_offset || ' month')::interval + interval '14 days')::date,
    m.revpar,
    m.occupancy_rate,
    m.avg_rating,
    m.response_time_minutes,
    m.total_revenue,
    m.ai_revenue_contribution,
    m.labor_cost_saved,
    m.revenue_attributed,
    m.time_saved_hours,
    m.roi_ratio,
    NOW(),
    NOW()
  FROM monthly_metrics m
  ON CONFLICT (property_id, metric_date) DO UPDATE
  SET
    revpar = EXCLUDED.revpar,
    occupancy_rate = EXCLUDED.occupancy_rate,
    avg_rating = EXCLUDED.avg_rating,
    response_time_minutes = EXCLUDED.response_time_minutes,
    total_revenue = EXCLUDED.total_revenue,
    ai_revenue_contribution = EXCLUDED.ai_revenue_contribution,
    labor_cost_saved = EXCLUDED.labor_cost_saved,
    revenue_attributed = EXCLUDED.revenue_attributed,
    time_saved_hours = EXCLUDED.time_saved_hours,
    roi_ratio = EXCLUDED.roi_ratio,
    updated_at = NOW();

  INSERT INTO property_metric_daily (
    property_id,
    metric_date,
    revpar,
    occupancy_rate,
    avg_rating,
    response_time_minutes,
    total_revenue,
    ai_revenue_contribution,
    labor_cost_saved,
    revenue_attributed,
    time_saved_hours,
    roi_ratio,
    created_at,
    updated_at
  )
  SELECT
    v_property_id,
    (CURRENT_DATE - day_offset)::date,
    187,
    87,
    4.60,
    144,
    13400,
    5640,
    705.71,
    5640,
    35.29,
    8.20,
    NOW(),
    NOW()
  FROM generate_series(0, 6) AS day_offset
  ON CONFLICT (property_id, metric_date) DO UPDATE
  SET
    revpar = EXCLUDED.revpar,
    occupancy_rate = EXCLUDED.occupancy_rate,
    avg_rating = EXCLUDED.avg_rating,
    response_time_minutes = EXCLUDED.response_time_minutes,
    total_revenue = EXCLUDED.total_revenue,
    ai_revenue_contribution = EXCLUDED.ai_revenue_contribution,
    labor_cost_saved = EXCLUDED.labor_cost_saved,
    revenue_attributed = EXCLUDED.revenue_attributed,
    time_saved_hours = EXCLUDED.time_saved_hours,
    roi_ratio = EXCLUDED.roi_ratio,
    updated_at = NOW();

  INSERT INTO booking_channel_daily (
    property_id,
    metric_date,
    channel_name,
    percentage,
    bookings_count,
    revenue_amount,
    created_at,
    updated_at
  )
  SELECT
    v_property_id,
    (CURRENT_DATE - d.day_offset)::date,
    ch.channel_name,
    ch.percentage,
    ch.bookings_count,
    ch.revenue_amount,
    NOW(),
    NOW()
  FROM generate_series(0, 6) AS d(day_offset)
  CROSS JOIN (
    VALUES
      ('Direct', 35::numeric, 35, 35000::numeric),
      ('OTA', 40::numeric, 40, 40000::numeric),
      ('Social', 15::numeric, 15, 15000::numeric),
      ('Email', 10::numeric, 10, 10000::numeric)
  ) AS ch(channel_name, percentage, bookings_count, revenue_amount)
  ON CONFLICT (property_id, metric_date, channel_name) DO UPDATE
  SET
    percentage = EXCLUDED.percentage,
    bookings_count = EXCLUDED.bookings_count,
    revenue_amount = EXCLUDED.revenue_amount,
    updated_at = NOW();

  INSERT INTO magic_tokens (
    id,
    user_id,
    email,
    token,
    expires_at,
    used_at,
    created_at
  )
  VALUES (
    'c0000000-0000-4000-8000-000000000001',
    v_user_id,
    'microsaas.farm@gmail.com',
    'b0cfbda7-68a5-4331-a47b-e7de0310a02a',
    NOW() + interval '1 day',
    NULL,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    token = EXCLUDED.token,
    expires_at = EXCLUDED.expires_at,
    used_at = EXCLUDED.used_at,
    created_at = NOW();
END;
$seed$;

COMMIT;
