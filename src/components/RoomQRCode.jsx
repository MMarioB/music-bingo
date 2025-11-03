import { QRCodeSVG } from 'qrcode.react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import PropTypes from 'prop-types';

const RoomQRCode = ({ roomCode }) => {
  const [copied, setCopied] = useState(false);

  // Construir la URL completa con query param para auto-join
  const joinUrl = `${window.location.origin}?room=${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
    }
  };

  const handleShare = async () => {
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
  };

  const handleWhatsApp = () => {
    const message = `🎵 ¡Únete a mi partida de *Music Bingo*! 🎵\n\n🎮 Código: *${roomCode}*\n🔗 Link directo: ${joinUrl}\n\n¡Vamos a ver quién tiene mejor oído musical! 🎶`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTelegram = () => {
    const message = `🎵 ¡Únete a mi partida de Music Bingo! 🎵\n\n🎮 Código: ${roomCode}\n¡Vamos a ver quién tiene mejor oído musical! 🎶`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <Card className="bg-black/40 border-white/20 p-4">
      <div className="flex flex-col items-center space-y-3">
        <h3 className="text-white font-semibold text-sm">Comparte para Unirse</h3>

        {/* QR Code */}
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG
            value={joinUrl}
            size={120}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Room Code */}
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Código de Sala</p>
          <p className="text-2xl font-bold text-purple-400 tracking-wider">{roomCode}</p>
        </div>

        {/* Botones de compartir */}
        <div className="space-y-2 w-full">
          {/* Fila 1: WhatsApp y Telegram */}
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

          {/* Fila 2: Copiar y Compartir */}
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

export default RoomQRCode;
