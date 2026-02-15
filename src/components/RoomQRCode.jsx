import React, { useMemo, useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import PropTypes from 'prop-types';

const RoomQRCode = ({ roomCode }) => {
  const [copied, setCopied] = useState(false);

  // Memoizar la URL para evitar recálculos
  const joinUrl = useMemo(() => `${window.location.origin}?room=${roomCode}`, [roomCode]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
    }
  }, [joinUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Music Bingo',
          text: `¡Únete a mi sala de Music Bingo! Código: ${roomCode}`,
          url: joinUrl,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      handleCopyLink();
    }
  }, [roomCode, joinUrl, handleCopyLink]);

  const handleWhatsApp = useCallback(() => {
    const message = `🎵 ¡Únete a mi partida de *Music Bingo*! 🎵\n\n🎮 Código: *${roomCode}*\n🔗 Link directo: ${joinUrl}\n\n¡Vamos a ver quién tiene mejor oído musical! 🎶`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }, [roomCode, joinUrl]);

  const handleTelegram = useCallback(() => {
    const message = `🎵 ¡Únete a mi partida de Music Bingo! 🎵\n\n🎮 Código: ${roomCode}\n¡Vamos a ver quién tiene mejor oído musical! 🎶`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(message)}`, '_blank');
  }, [roomCode, joinUrl]);

  // Memoizar el QR code SVG (solo cambia cuando cambia roomCode)
  const qrCode = useMemo(() => (
    <QRCodeSVG
      value={joinUrl}
      size={120}
      level="H"
      includeMargin={false}
    />
  ), [joinUrl]);

  return (
    <Card className="bg-black/40 border-white/20 p-4">
      <div className="flex flex-col items-center space-y-3">
        <h3 className="text-white font-semibold text-sm">Comparte para Unirse</h3>

        <div className="bg-white p-3 rounded-lg">
          {qrCode}
        </div>

        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Código de Sala</p>
          <p className="text-2xl font-bold text-purple-400 tracking-wider">{roomCode}</p>
        </div>

        <div className="space-y-2 w-full">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleWhatsApp}
              size="sm"
              className="bg-green-600/80 hover:bg-green-600 border-green-500 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>

            <Button
              onClick={handleTelegram}
              size="sm"
              className="bg-blue-500/80 hover:bg-blue-500 border-blue-400 text-white"
            >
              <Send className="h-4 w-4 mr-1" />
              Telegram
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant="outline"
              className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>

            {navigator.share && (
              <Button
                onClick={handleShare}
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Compartir
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

RoomQRCode.propTypes = {
  roomCode: PropTypes.string.isRequired,
};

export default React.memo(RoomQRCode);
