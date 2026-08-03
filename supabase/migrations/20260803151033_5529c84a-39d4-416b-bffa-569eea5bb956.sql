GRANT INSERT ON public.tts_request_logs TO authenticated;

CREATE POLICY "Users can log their own tts events"
ON public.tts_request_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());