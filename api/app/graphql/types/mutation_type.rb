# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    field :sign_in, mutation: Mutations::SignIn, null: true
    field :sign_up, mutation: Mutations::SignUp, null: true
    field :create_class_template, mutation: Mutations::CreateClassTemplate, null: true
    field :update_class_template, mutation: Mutations::UpdateClassTemplate, null: true
    field :delete_class_template, mutation: Mutations::DeleteClassTemplate, null: true
    field :create_class_session, mutation: Mutations::CreateClassSession, null: true
    field :update_class_session, mutation: Mutations::UpdateClassSession, null: true
    field :delete_class_session, mutation: Mutations::DeleteClassSession, null: true
    field :create_booking, mutation: Mutations::CreateBooking, null: true
    field :cancel_booking, mutation: Mutations::CancelBooking, null: true
    field :archive_booking, mutation: Mutations::ArchiveBooking, null: true
    field :mark_no_show_booking, mutation: Mutations::MarkNoShowBooking, null: true
    field :rebook_booking, mutation: Mutations::RebookBooking, null: true
    field :rebook_booking_with_payment, mutation: Mutations::RebookBookingWithPayment, null: true
    field :create_client, mutation: Mutations::CreateClient, null: true
    field :update_client, mutation: Mutations::UpdateClient, null: true
    field :delete_client, mutation: Mutations::DeleteClient, null: true
    field :create_client_note, mutation: Mutations::CreateClientNote, null: true
    field :sign_in_with_google, mutation: Mutations::SignInWithGoogle, null: true
    field :update_user, mutation: Mutations::UpdateUser, null: true
    field :update_profile, mutation: Mutations::UpdateProfile, null: true
    field :update_payment_settings, mutation: Mutations::UpdatePaymentSettings, null: true
    field :create_setup_intent, mutation: Mutations::CreateSetupIntent, null: true
    field :save_my_payment_method, mutation: Mutations::SaveMyPaymentMethod, null: true
    field :remove_my_payment_method, mutation: Mutations::RemoveMyPaymentMethod, null: true
    field :set_my_default_payment_method, mutation: Mutations::SetMyDefaultPaymentMethod, null: true
    field :create_booking_with_payment, mutation: Mutations::CreateBookingWithPayment, null: true
    field :toggle_client_block, mutation: Mutations::ToggleClientBlock, null: true
    field :start_impersonation, mutation: Mutations::StartImpersonation, null: true
    field :create_studio_location, mutation: Mutations::CreateStudioLocation, null: true
    field :update_studio_location, mutation: Mutations::UpdateStudioLocation, null: true
    field :delete_studio_location, mutation: Mutations::DeleteStudioLocation, null: true

    field :create_instructor_payout, mutation: Mutations::CreateInstructorPayout, null: true
    field :pay_instructor_payout, mutation: Mutations::PayInstructorPayout, null: true
    field :mark_instructor_payout_paid, mutation: Mutations::MarkInstructorPayoutPaid, null: true
    field :create_instructor_connect_onboarding, mutation: Mutations::CreateInstructorConnectOnboarding, null: true
    field :refresh_instructor_connect_status, mutation: Mutations::RefreshInstructorConnectStatus, null: true

    field :invite_user, mutation: Mutations::InviteUser, null: true

    field :toggle_favorite_class_session, mutation: Mutations::ToggleFavoriteClassSession, null: true

    field :create_booking_checkout_session, mutation: Mutations::CreateBookingCheckoutSession, null: true
    field :confirm_booking_checkout_payment, mutation: Mutations::ConfirmBookingCheckoutPayment, null: true
    field :send_booking_payment_reminder, mutation: Mutations::SendBookingPaymentReminder, null: true

    field :upsert_studio_subscription, mutation: Mutations::UpsertStudioSubscription, null: true
    field :create_platform_subscription_checkout, mutation: Mutations::CreatePlatformSubscriptionCheckout, null: true
    field :create_billing_portal_session, mutation: Mutations::CreateBillingPortalSession, null: true
    field :create_owner_setup_intent, mutation: Mutations::CreateOwnerSetupIntent, null: true
    field :save_owner_payment_method, mutation: Mutations::SaveOwnerPaymentMethod, null: true

    field :update_studio, mutation: Mutations::UpdateStudio, null: true
    field :complete_onboarding, mutation: Mutations::CompleteOnboarding, null: true

    field :invite_client, mutation: Mutations::InviteClient, null: true

    field :create_bundle_product, mutation: Mutations::CreateBundleProduct, null: true
    field :update_bundle_product, mutation: Mutations::UpdateBundleProduct, null: true
    field :delete_bundle_product, mutation: Mutations::DeleteBundleProduct, null: true
    field :purchase_bundle_product, mutation: Mutations::PurchaseBundleProduct, null: true
    field :create_booking_with_bundle, mutation: Mutations::CreateBookingWithBundle, null: true

    field :create_membership_plan, mutation: Mutations::CreateMembershipPlan, null: true
    field :update_membership_plan, mutation: Mutations::UpdateMembershipPlan, null: true
    field :delete_membership_plan, mutation: Mutations::DeleteMembershipPlan, null: true
    field :enroll_client_membership, mutation: Mutations::EnrollClientMembership, null: true
    field :update_client_membership, mutation: Mutations::UpdateClientMembership, null: true
    field :purchase_client_membership, mutation: Mutations::PurchaseClientMembership, null: true

    field :create_moderator, mutation: Mutations::CreateModerator, null: true

    # Godmode only
    field :send_test_email, mutation: Mutations::SendTestEmail, null: true
  end
end
